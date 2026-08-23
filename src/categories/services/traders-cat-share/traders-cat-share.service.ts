// src/categories/services/traders-cat-share/traders-cat-share.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateTraderCategoryWithSharesDto } from './dto/create-trader-category-with-shares.dto';
import { UpdateTraderCategoryWithSharesDto } from './dto/update-trader-category-with-shares.dto';
import { SetTraderCategoryShareDto } from './dto/set-trader-category-share.dto';
import { TraderCategoryShareConditionDto } from './dto/trader-category-share-condition.dto';
import {
  extractPercentValue,
  isManagerOrAbove,
  toWorkerShareView,
  transformCategoryWithShares,
  validateSharesPayload,
} from './utils/traders-cat-share.utils';
import { validateGradeGroups } from '../../utils/trader-category-grade-groups.util';
import { validateSharePercentRows } from '../../utils/share-percent-validation.util';

const CATEGORY_WITH_SHARES_INCLUDE = {
  traderCategoryShares: {
    where: { shareConditionId: null },
    orderBy: { traderId: 'asc' as const },
    include: {
      trader: { select: { name: true } },
    },
  },
  traderCategoryShareConditions: {
    // Every condition ever created, including ENDED ones — shown read-only in the category form
    // so the history stays visible instead of silently disappearing once a condition finishes.
    orderBy: { createdAt: 'asc' as const },
    include: {
      shares: {
        orderBy: { traderId: 'asc' as const },
        include: { trader: { select: { name: true } } },
      },
      _count: { select: { traderStock: true } },
    },
  },
};

@Injectable()
export class TraderCatShareService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private normalizeCategoryName(name: string | undefined): string | undefined {
    if (name === undefined) {
      return undefined;
    }

    return name.trim();
  }

  private assertCategoryNamePresent(
    name: string | undefined,
  ): asserts name is string {
    if (!name) {
      throw new BadRequestException('Category name is required.');
    }
  }

  private getUniqueTraderIds(shares: Array<{ traderId: number }>): number[] {
    return [...new Set(shares.map((share) => Number(share.traderId)))];
  }

  private async assertTradersExist(traderIds: number[]) {
    const traders = await this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true },
    });

    if (traders.length !== traderIds.length) {
      throw new NotFoundException(
        'One or more selected traders were not found.',
      );
    }
  }

  private async assertCategoryNameUniqueInSeason(
    name: string,
    seasonId: number,
    excludeCategoryId?: number,
  ) {
    const duplicate = await this.prisma.tradersCategories.findUnique({
      where: {
        name_seasonId: { name, seasonId },
      },
    });

    if (duplicate && duplicate.id !== excludeCategoryId) {
      throw new ConflictException(
        `Category "${name}" already exists in this season`,
      );
    }
  }

  private async createCategoryWithSharesInTransaction(
    dto: CreateTraderCategoryWithSharesDto,
    categoryName: string,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const lastCategory = await tx.tradersCategories.findFirst({
        where: { seasonId: dto.seasonId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      const nextOrderIndex = (lastCategory?.orderIndex ?? -1) + 1;

      const createdCategory = await tx.tradersCategories.create({
        data: {
          seasonId: dto.seasonId,
          name: categoryName,
          notes: dto.notes,
          supportedGrades: dto.supportedGrades,
          gradeGroups: dto.gradeGroups ?? [],
          orderIndex: nextOrderIndex,
        },
        select: { id: true },
      });

      await tx.traderCategoryShare.createMany({
        data: dto.shares.map((share) => ({
          seasonId: dto.seasonId,
          traderCategoryId: createdCategory.id,
          traderId: Number(share.traderId),
          percent: Number(share.percent),
        })),
      });

      for (const condition of dto.conditions ?? []) {
        await this.applyConditionInTransaction(tx, {
          seasonId: dto.seasonId,
          traderCategoryId: createdCategory.id,
          condition,
        });
      }

      return createdCategory.id;
    });
  }

  private async replaceCategorySharesInTransaction(
    dto: UpdateTraderCategoryWithSharesDto,
    seasonId: number,
    categoryName: string | undefined,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.tradersCategories.update({
        where: { id: dto.id },
        data: {
          name: categoryName,
          notes: dto.notes,
          supportedGrades: dto.supportedGrades,
          ...(dto.gradeGroups !== undefined ? { gradeGroups: dto.gradeGroups } : {}),
        },
      });

      // Only the default rows (shareConditionId: null) are replaced here — rows belonging to a
      // TraderCategoryShareCondition are untouched unless dto.condition explicitly targets them.
      await tx.traderCategoryShare.deleteMany({
        where: {
          traderCategoryId: dto.id,
          seasonId,
          shareConditionId: null,
        },
      });

      await tx.traderCategoryShare.createMany({
        data: dto.shares.map((share) => ({
          seasonId,
          traderCategoryId: dto.id,
          traderId: Number(share.traderId),
          percent: Number(share.percent),
        })),
      });

      for (const condition of dto.conditions ?? []) {
        await this.applyConditionInTransaction(tx, {
          seasonId,
          traderCategoryId: dto.id,
          condition,
        });
      }
    });
  }

  // Handles create/update/disable/delete of one of a category's distribution conditions, staged
  // entirely client-side until the category form itself is saved (see
  // TraderCategoryShareConditionDto). Called once per submitted condition, inside the same
  // transaction as the default shares, so a failed condition never leaves the default shares
  // partially replaced. Runs sequentially so two new conditions submitted together are checked for
  // overlap against each other too (each write becomes visible to the next iteration's query,
  // since both run inside the same transaction).
  private async applyConditionInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      traderCategoryId: number;
      condition: TraderCategoryShareConditionDto;
    },
  ) {
    const { condition } = params;

    if (condition.action === 'DELETE') {
      if (!condition.id) {
        throw new BadRequestException('Cannot delete a distribution condition that was never saved.');
      }

      const linkedStockCount = await tx.traderStock.count({ where: { shareConditionId: condition.id } });
      if (linkedStockCount > 0) {
        throw new BadRequestException(
          'Cannot delete a distribution condition that already has linked inventory movements. Disable it instead.',
        );
      }

      await tx.traderCategoryShare.deleteMany({ where: { shareConditionId: condition.id } });
      await tx.traderCategoryShareCondition.delete({ where: { id: condition.id } });
      return;
    }

    if (condition.id) {
      const existing = await tx.traderCategoryShareCondition.findUnique({
        where: { id: condition.id },
        select: { status: true },
      });
      if (existing?.status === 'ENDED') {
        throw new BadRequestException(
          'This distribution condition has already ended and can no longer be edited — "if it\'s ended, it\'s ended".',
        );
      }
    }

    validateSharePercentRows(condition.shares);

    const startDate = new Date(condition.startDate);
    const endDate = condition.endDate ? new Date(condition.endDate) : null;

    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new BadRequestException('Invalid start/end date for the distribution condition.');
    }
    if (endDate && endDate <= startDate) {
      throw new BadRequestException('The condition end date must be after its start date.');
    }

    if (condition.status === 'ACTIVE') {
      await this.assertNoOverlappingActiveCondition(tx, {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
        startDate,
        endDate,
        excludeConditionId: condition.id,
      });
    }

    const traderIds = this.getUniqueTraderIds(condition.shares);
    await this.assertTradersExist(traderIds);

    const conditionRow = condition.id
      ? await tx.traderCategoryShareCondition.update({
          where: { id: condition.id },
          data: {
            name: condition.name,
            startDate,
            endDate,
            endQuantityThreshold: condition.endQuantityThreshold ?? null,
            endConditionMode: condition.endConditionMode,
            status: condition.status,
          },
        })
      : await tx.traderCategoryShareCondition.create({
          data: {
            seasonId: params.seasonId,
            traderCategoryId: params.traderCategoryId,
            name: condition.name,
            startDate,
            endDate,
            endQuantityThreshold: condition.endQuantityThreshold ?? null,
            endConditionMode: condition.endConditionMode,
            status: condition.status,
          },
        });

    await tx.traderCategoryShare.deleteMany({ where: { shareConditionId: conditionRow.id } });
    await tx.traderCategoryShare.createMany({
      data: condition.shares.map((share) => ({
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
        traderId: Number(share.traderId),
        percent: Number(share.percent),
        shareConditionId: conditionRow.id,
      })),
    });
  }

  // Blocks creating/re-activating a condition whose [startDate, endDate ?? ∞) range overlaps an
  // existing ACTIVE condition for the same category+season — the resolver assumes at most one
  // ACTIVE condition can match a given date.
  private async assertNoOverlappingActiveCondition(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      traderCategoryId: number;
      startDate: Date;
      endDate: Date | null;
      excludeConditionId?: number;
    },
  ) {
    const OPEN_ENDED = new Date(8640000000000000);
    const newEnd = params.endDate ?? OPEN_ENDED;

    const activeConditions = await tx.traderCategoryShareCondition.findMany({
      where: {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
        status: 'ACTIVE',
        ...(params.excludeConditionId ? { id: { not: params.excludeConditionId } } : {}),
      },
      select: { id: true, startDate: true, endDate: true },
    });

    const overlapping = activeConditions.find((existing) => {
      const existingEnd = existing.endDate ?? OPEN_ENDED;
      return existing.startDate <= newEnd && params.startDate <= existingEnd;
    });

    if (overlapping) {
      throw new BadRequestException(
        `This condition's date range overlaps with an existing active condition (#${overlapping.id}) for this category. Disable or adjust the other condition first.`,
      );
    }
  }

  private async findCategoryWithSharesById(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
      include: CATEGORY_WITH_SHARES_INCLUDE,
    });
  }

  private async findExistingCategoryForUpdate(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
      select: { id: true, seasonId: true, name: true, supportedGrades: true },
    });
  }

  private async findCurrentShare(id: number) {
    return this.prisma.traderCategoryShare.findUnique({
      where: { id },
      select: {
        id: true,
        seasonId: true,
        traderId: true,
        traderCategoryId: true,
      },
    });
  }

  private async findSharesForCategoryInSeason(
    seasonId: number,
    traderCategoryId: number,
  ) {
    return this.prisma.traderCategoryShare.findMany({
      where: {
        seasonId,
        traderCategoryId,
        shareConditionId: null,
      },
      select: {
        traderId: true,
        percent: true,
      },
    });
  }

  private async findAllSharesManagerViewBySeason(seasonId: number) {
    return this.prisma.traderCategoryShare.findMany({
      where: { seasonId, shareConditionId: null },
      include: {
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
      orderBy: [
        { traderCategory: { name: 'asc' } },
        { trader: { name: 'asc' } },
      ],
    });
  }

  private async findAllSharesWorkerViewBySeason(seasonId: number) {
    return this.prisma.traderCategoryShare.findMany({
      where: { seasonId, shareConditionId: null },
      select: {
        id: true,
        traderId: true,
        percent: true,
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
      orderBy: [{ traderCategory: { name: 'asc' } }, { id: 'asc' }],
    });
  }

  private async findShareByIdManagerView(id: number) {
    return this.prisma.traderCategoryShare.findUnique({
      where: { id },
      include: {
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
    });
  }

  private async findShareByIdWorkerView(id: number) {
    return this.prisma.traderCategoryShare.findUnique({
      where: { id },
      select: {
        id: true,
        traderId: true,
        percent: true,
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
    });
  }

  async createWithShares(dto: CreateTraderCategoryWithSharesDto) {
    await this.seasonsService.assertSeasonExists(dto.seasonId);
    validateSharesPayload(dto.shares);

    const categoryName = this.normalizeCategoryName(dto.name);
    this.assertCategoryNamePresent(categoryName);

    await this.assertCategoryNameUniqueInSeason(categoryName, dto.seasonId);

    validateGradeGroups(dto.gradeGroups, dto.supportedGrades ?? []);

    const traderIds = this.getUniqueTraderIds(dto.shares);
    await this.assertTradersExist(traderIds);

    const categoryId = await this.createCategoryWithSharesInTransaction(
      dto,
      categoryName,
    );

    const created = await this.findCategoryWithSharesById(categoryId);

    if (!created) {
      throw new NotFoundException('Created category not found.');
    }

    return transformCategoryWithShares(created);
  }

  async updateWithShares(dto: UpdateTraderCategoryWithSharesDto) {
    validateSharesPayload(dto.shares);

    const category = await this.findExistingCategoryForUpdate(dto.id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryName = this.normalizeCategoryName(dto.name);
    if (dto.name !== undefined) {
      this.assertCategoryNamePresent(categoryName);
    }

    if (categoryName && categoryName !== category.name) {
      await this.assertCategoryNameUniqueInSeason(
        categoryName,
        category.seasonId,
        dto.id,
      );
    }

    if (dto.gradeGroups !== undefined) {
      validateGradeGroups(dto.gradeGroups, dto.supportedGrades ?? category.supportedGrades);
    }

    const traderIds = this.getUniqueTraderIds(dto.shares);
    await this.assertTradersExist(traderIds);

    await this.replaceCategorySharesInTransaction(
      dto,
      category.seasonId,
      categoryName,
    );

    const updated = await this.findCategoryWithSharesById(dto.id);

    if (!updated) {
      throw new NotFoundException('Updated category not found.');
    }

    return transformCategoryWithShares(updated);
  }

  async findAllWithSharesBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const categories = await this.prisma.tradersCategories.findMany({
      where: { seasonId },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: CATEGORY_WITH_SHARES_INCLUDE,
    });

    return categories.map((category) => transformCategoryWithShares(category));
  }

  // Every distribution condition ever created for the season, including ENDED ones — unlike
  // CATEGORY_WITH_SHARES_INCLUDE (which drops ENDED so they don't clutter the category edit form),
  // this powers the trader-inventory "distribution method" filter, where historical/ended
  // conditions must still be selectable to filter past stock.
  async findAllConditionsBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const conditions = await this.prisma.traderCategoryShareCondition.findMany({
      where: { seasonId },
      select: {
        id: true,
        name: true,
        status: true,
        traderCategoryId: true,
        traderCategory: { select: { name: true } },
      },
      orderBy: [{ traderCategory: { name: 'asc' } }, { startDate: 'asc' }],
    });

    return conditions.map((condition) => ({
      id: condition.id,
      name: condition.name,
      status: condition.status,
      traderCategoryId: condition.traderCategoryId,
      traderCategoryName: condition.traderCategory.name,
    }));
  }

  private async validateCategoryTotalPercent(
    seasonId: number,
    traderCategoryId: number,
    newPercent: number,
    excludeTraderId?: number,
  ) {
    const shares = await this.findSharesForCategoryInSeason(
      seasonId,
      traderCategoryId,
    );

    let total = newPercent;
    for (const share of shares) {
      if (excludeTraderId && share.traderId === excludeTraderId) {
        continue;
      }
      total += Number(share.percent);
    }

    if (total > 100) {
      throw new BadRequestException(
        `Total share percent cannot exceed 100% for category ${traderCategoryId}. Current total would be ${total.toFixed(2)}%.`,
      );
    }
  }

  // Set or Update a share for a trader in a category for a specific season
  async setShare(data: SetTraderCategoryShareDto) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    await this.validateCategoryTotalPercent(
      seasonId,
      data.traderCategoryId,
      data.percent,
      data.traderId,
    );

    // Prisma's compound-unique lookup can't match a nullable column via `= NULL`, so the
    // default row (shareConditionId: null) can't be targeted through `upsert`'s `where` directly
    // — find it first, then update/create by id.
    const existingDefaultShare = await this.prisma.traderCategoryShare.findFirst({
      where: {
        traderId: data.traderId,
        traderCategoryId: data.traderCategoryId,
        seasonId,
        shareConditionId: null,
      },
      select: { id: true },
    });

    const share = existingDefaultShare
      ? await this.prisma.traderCategoryShare.update({
          where: { id: existingDefaultShare.id },
          data: { percent: data.percent },
          include: {
            trader: { select: { id: true, name: true } },
            traderCategory: { select: { id: true, name: true } },
          },
        })
      : await this.prisma.traderCategoryShare.create({
          data: {
            seasonId,
            traderId: data.traderId,
            traderCategoryId: data.traderCategoryId,
            percent: data.percent,
          },
          include: {
            trader: { select: { id: true, name: true } },
            traderCategory: { select: { id: true, name: true } },
          },
        });

    return {
      id: share.id,
      seasonId: share.seasonId,
      traderId: share.traderId,
      traderName: share.trader.name,
      traderCategoryId: share.traderCategoryId,
      traderCategoryName: share.traderCategory.name,
      percent: Number(share.percent),
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    };
  }

  // Find shares for a specific season with names included
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    if (isManagerOrAbove(actor)) {
      return this.findAllSharesManagerViewBySeason(seasonId);
    }

    const records = await this.findAllSharesWorkerViewBySeason(seasonId);

    return records.map((record) => toWorkerShareView(record));
  }

  // Find a specific share by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = isManagerOrAbove(actor);

    const share = managerOrAbove
      ? await this.findShareByIdManagerView(id)
      : await this.findShareByIdWorkerView(id);

    if (!share) throw new NotFoundException(`Share record #${id} not found`);
    return managerOrAbove ? share : toWorkerShareView(share);
  }

  // Find a share by trader, category, and season
  async findByTraderAndCategory(
    traderId: number,
    traderCategoryId: number,
    seasonId: number,
    actor: AuthenticatedUser,
  ) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);

    if (managerOrAbove) {
      return this.prisma.traderCategoryShare.findFirst({
        where: {
          traderId,
          traderCategoryId,
          seasonId,
          shareConditionId: null,
        },
      });
    }

    const share = await this.prisma.traderCategoryShare.findFirst({
      where: {
        traderId,
        traderCategoryId,
        seasonId,
        shareConditionId: null,
      },
      select: {
        id: true,
        traderId: true,
        percent: true,
        trader: { select: { name: true } },
        traderCategory: { select: { name: true } },
      },
    });

    if (!share)
      throw new NotFoundException(
        `Share record not found for traderId=${traderId}, traderCategoryId=${traderCategoryId}, seasonId=${seasonId}`,
      );
    return toWorkerShareView(share);
  }

  // Standard Update
  async update(id: number, data: Prisma.TraderCategoryShareUpdateInput) {
    const currentShare = await this.findCurrentShare(id);

    if (!currentShare) {
      throw new NotFoundException(`Share record #${id} not found`);
    }

    const nextPercent = extractPercentValue(data.percent);
    if (nextPercent !== undefined) {
      await this.validateCategoryTotalPercent(
        currentShare.seasonId,
        currentShare.traderCategoryId,
        nextPercent,
        currentShare.traderId,
      );
    }

    return this.prisma.traderCategoryShare.update({
      where: { id },
      data,
    });
  }

  // Remove a share record
  async remove(id: number) {
    try {
      return await this.prisma.traderCategoryShare.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete trader category share because related records exist in the system.',
        );
      }

      throw error;
    }
  }
}
