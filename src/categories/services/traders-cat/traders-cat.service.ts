// src/categories/services/traders-cat/traders-cat.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CreateTraderCategoryDto } from './dto/create-trader-category.dto';
import { UpdateTraderCategoryDto } from './dto/update-trader-category.dto';
import { ReorderTraderCategoriesDto } from './dto/reorder-trader-categories.dto';
import {
  isManagerOrAbove,
  toWorkerTraderCategoryView,
} from './utils/traders-cat.utils';
import { validateGradeGroups } from '../../utils/trader-category-grade-groups.util';

@Injectable()
export class TradersCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private async findCategoryByNameAndSeason(name: string, seasonId: number) {
    return this.prisma.tradersCategories.findUnique({
      where: {
        name_seasonId: { name, seasonId },
      },
    });
  }

  private async findManagerViewById(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
    });
  }

  private async findWorkerViewById(id: number) {
    return this.prisma.tradersCategories.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        notes: true,
        supportedGrades: true,
        gradeGroups: true,
      },
    });
  }

  private async findManagerViewByName(name: string, seasonId: number) {
    return this.findCategoryByNameAndSeason(name, seasonId);
  }

  private async findWorkerViewByName(name: string, seasonId: number) {
    return this.prisma.tradersCategories.findUnique({
      where: {
        name_seasonId: { name, seasonId },
      },
      select: {
        id: true,
        name: true,
        notes: true,
        supportedGrades: true,
        gradeGroups: true,
      },
    });
  }

  private async findManyManagerViewBySeason(seasonId: number) {
    return this.prisma.tradersCategories.findMany({
      where: { seasonId },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  private async findManyWorkerViewBySeason(seasonId: number) {
    return this.prisma.tradersCategories.findMany({
      where: { seasonId },
      select: {
        id: true,
        name: true,
        notes: true,
        supportedGrades: true,
        gradeGroups: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  // Create a new category for the active season
  async create(dto: CreateTraderCategoryDto) {
    const name = dto.name;
    const notes = dto.notes;
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const existing = await this.findCategoryByNameAndSeason(name, seasonId);

    if (existing) {
      throw new ConflictException(
        `Category "${name}" already exists in this season`,
      );
    }

    validateGradeGroups(dto.gradeGroups, dto.supportedGrades ?? []);

    return this.prisma.tradersCategories.create({
      data: {
        name,
        notes,
        seasonId,
        supportedGrades: dto.supportedGrades,
        gradeGroups: dto.gradeGroups ?? [],
      },
    });
  }

  // Find all categories for a specific season
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    if (isManagerOrAbove(actor)) {
      return this.findManyManagerViewBySeason(seasonId);
    }

    const records = await this.findManyWorkerViewBySeason(seasonId);

    return records.map((record) => toWorkerTraderCategoryView(record));
  }

  // Find one category by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = isManagerOrAbove(actor);

    const category = managerOrAbove
      ? await this.findManagerViewById(id)
      : await this.findWorkerViewById(id);

    if (!category) throw new NotFoundException(`Category not found`);
    return managerOrAbove ? category : toWorkerTraderCategoryView(category);
  }

  // Find one category by name and season
  async findByName(name: string, seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = isManagerOrAbove(actor);

    const category = managerOrAbove
      ? await this.findManagerViewByName(name, seasonId)
      : await this.findWorkerViewByName(name, seasonId);

    if (!category)
      throw new NotFoundException(`Category ${name} not found in this season`);
    return managerOrAbove ? category : toWorkerTraderCategoryView(category);
  }

  // Update category details
  async update(id: number, data: Omit<UpdateTraderCategoryDto, 'id'>) {
    if (data.gradeGroups !== undefined) {
      const supportedGrades =
        data.supportedGrades ??
        (await this.prisma.tradersCategories.findUnique({
          where: { id },
          select: { supportedGrades: true },
        }))?.supportedGrades ??
        [];

      validateGradeGroups(data.gradeGroups, supportedGrades);
    }

    return this.prisma.tradersCategories.update({
      where: { id },
      data,
    });
  }

  // Persist a manual priority order for all categories in a season
  async reorder(dto: ReorderTraderCategoriesDto) {
    const existing = await this.prisma.tradersCategories.findMany({
      where: { seasonId: dto.seasonId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((category) => category.id));
    const uniqueOrderedIds = new Set(dto.orderedIds);

    if (
      uniqueOrderedIds.size !== dto.orderedIds.length ||
      uniqueOrderedIds.size !== existingIds.size ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'orderedIds must contain exactly the set of category IDs for this season.',
      );
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.tradersCategories.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    return { orderedIds: dto.orderedIds };
  }

  // Remove a category
  // Blocked only if classifications, stock items, or shipment items are linked.
  // TraderCategoryShare (trader config) is deleted automatically before removal.
  async remove(id: number) {
    const category = await this.prisma.tradersCategories.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            classifications: true,
            traderStocks: true,
            shipmentItems: true,
          },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    const { classifications, traderStocks, shipmentItems } = category._count;
    if (classifications > 0 || traderStocks > 0 || shipmentItems > 0) {
      throw new ConflictException(
        'Cannot delete trader category because classifications, stock items, or shipment items are linked to it.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.traderCategoryShare.deleteMany({ where: { traderCategoryId: id } });
      return tx.tradersCategories.delete({ where: { id } });
    });
  }
}
