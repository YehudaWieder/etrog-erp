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
import {
  extractPercentValue,
  isManagerOrAbove,
  toWorkerShareView,
  transformCategoryWithShares,
  validateSharesPayload,
} from './utils/traders-cat-share.utils';

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
        },
      });

      await tx.traderCategoryShare.deleteMany({
        where: {
          traderCategoryId: dto.id,
          seasonId,
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
    });
  }

  private async findCategoryWithSharesById(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
      include: {
        traderCategoryShares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: { select: { name: true } },
          },
        },
      },
    });
  }

  private async findExistingCategoryForUpdate(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
      select: { id: true, seasonId: true, name: true },
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
      },
      select: {
        traderId: true,
        percent: true,
      },
    });
  }

  private async findAllSharesManagerViewBySeason(seasonId: number) {
    return this.prisma.traderCategoryShare.findMany({
      where: { seasonId },
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
      where: { seasonId },
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
      include: {
        traderCategoryShares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: { select: { name: true } },
          },
        },
      },
    });

    return categories.map((category) => transformCategoryWithShares(category));
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

    const share = await this.prisma.traderCategoryShare.upsert({
      where: {
        traderId_traderCategoryId_seasonId: {
          traderId: data.traderId,
          traderCategoryId: data.traderCategoryId,
          seasonId,
        },
      },
      update: {
        percent: data.percent,
      },
      create: {
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
      return this.prisma.traderCategoryShare.findUnique({
        where: {
          traderId_traderCategoryId_seasonId: {
            traderId,
            traderCategoryId,
            seasonId,
          },
        },
      });
    }

    const share = await this.prisma.traderCategoryShare.findUnique({
      where: {
        traderId_traderCategoryId_seasonId: {
          traderId,
          traderCategoryId,
          seasonId,
        },
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
