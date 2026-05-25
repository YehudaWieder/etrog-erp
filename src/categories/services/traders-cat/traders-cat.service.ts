// src/categories/services/traders-cat/traders-cat.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  CreateTraderCategoryWithSharesSwaggerDto,
  UpdateTraderCategoryWithSharesSwaggerDto,
} from 'src/docs/dto/swagger-enums.dto';

@Injectable()
export class TradersCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private static readonly CATEGORY_TOTAL_EPSILON = 0.001;

  private isManagerOrAbove(actor: AuthenticatedUser) {
    return actor.role === Role.MANAGER || actor.role === Role.OWNER;
  }

  private toWorkerCategoryView(record: { id: number; name: string; notes: string | null }) {
    return {
      id: record.id,
      name: record.name,
      grade: null,
      percent: null,
      notes: record.notes,
    };
  }

  private transformCategoryWithShares(record: {
    id: number;
    seasonId: number;
    name: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    traderCategoryShares: Array<{
      traderId: number;
      percent: Prisma.Decimal;
      trader: { name: string };
    }>;
  }) {
    let totalPercent = 0;
    const shares = record.traderCategoryShares.map((share) => {
      const percent = Number(share.percent);
      totalPercent += percent;
      return {
        traderId: share.traderId,
        traderName: share.trader.name,
        percent,
      };
    });

    return {
      id: record.id,
      seasonId: record.seasonId,
      name: record.name,
      notes: record.notes,
      shares,
      totalPercent: Number(totalPercent.toFixed(2)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private validateSharesPayload(shares: Array<{ traderId: number; percent: number }>) {
    if (!shares?.length) {
      throw new BadRequestException('At least one trader share row is required.');
    }

    const seenTraderIds = new Set<number>();
    let totalPercent = 0;

    for (const share of shares) {
      const traderId = Number(share.traderId);
      const percent = Number(share.percent);

      if (!Number.isInteger(traderId) || traderId <= 0) {
        throw new BadRequestException('Each share row must include a valid trader ID.');
      }

      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        throw new BadRequestException('Each share percent must be a number greater than 0 and up to 100.');
      }

      if (seenTraderIds.has(traderId)) {
        throw new BadRequestException('Trader rows must be unique within a category.');
      }

      seenTraderIds.add(traderId);
      totalPercent += percent;
    }

    if (Math.abs(totalPercent - 100) > TradersCatService.CATEGORY_TOTAL_EPSILON) {
      throw new BadRequestException(`Total share percent must be exactly 100%. Current total is ${totalPercent.toFixed(2)}%.`);
    }
  }

  // Create a new category for the active season
  async create(name: string, notes?: string) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const existing = await this.prisma.tradersCategories.findUnique({
      where: {
        name_seasonId: { name, seasonId },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${name}" already exists in this season`);
    }

    return this.prisma.tradersCategories.create({
      data: {
        name,
        notes,
        seasonId,
      },
    });
  }

  async createWithShares(dto: CreateTraderCategoryWithSharesSwaggerDto) {
    await this.seasonsService.assertSeasonExists(dto.seasonId);
    this.validateSharesPayload(dto.shares);

    const categoryName = dto.name.trim();
    if (!categoryName) {
      throw new BadRequestException('Category name is required.');
    }

    const existing = await this.prisma.tradersCategories.findUnique({
      where: {
        name_seasonId: { name: categoryName, seasonId: dto.seasonId },
      },
    });

    if (existing) {
      throw new ConflictException(`Category "${categoryName}" already exists in this season`);
    }

    const traderIds = [...new Set(dto.shares.map((share) => Number(share.traderId)))];
    const traders = await this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true },
    });

    if (traders.length !== traderIds.length) {
      throw new NotFoundException('One or more selected traders were not found.');
    }

    const categoryId = await this.prisma.$transaction(async (tx) => {
      const createdCategory = await tx.tradersCategories.create({
        data: {
          seasonId: dto.seasonId,
          name: categoryName,
          notes: dto.notes,
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

    const created = await this.prisma.tradersCategories.findUnique({
      where: { id: categoryId },
      include: {
        traderCategoryShares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: { select: { name: true } },
          },
        },
      },
    });

    if (!created) {
      throw new NotFoundException('Created category not found.');
    }

    return this.transformCategoryWithShares(created);
  }

  async updateWithShares(dto: UpdateTraderCategoryWithSharesSwaggerDto) {
    this.validateSharesPayload(dto.shares);

    const category = await this.prisma.tradersCategories.findUnique({
      where: { id: dto.id },
      select: { id: true, seasonId: true, name: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryName = dto.name?.trim();
    if (dto.name !== undefined && !categoryName) {
      throw new BadRequestException('Category name is required.');
    }

    if (categoryName && categoryName !== category.name) {
      const duplicate = await this.prisma.tradersCategories.findUnique({
        where: {
          name_seasonId: { name: categoryName, seasonId: category.seasonId },
        },
      });

      if (duplicate && duplicate.id !== dto.id) {
        throw new ConflictException(`Category "${categoryName}" already exists in this season`);
      }
    }

    const traderIds = [...new Set(dto.shares.map((share) => Number(share.traderId)))];
    const traders = await this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true },
    });

    if (traders.length !== traderIds.length) {
      throw new NotFoundException('One or more selected traders were not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tradersCategories.update({
        where: { id: dto.id },
        data: {
          name: categoryName,
          notes: dto.notes,
        },
      });

      await tx.traderCategoryShare.deleteMany({
        where: {
          traderCategoryId: dto.id,
          seasonId: category.seasonId,
        },
      });

      await tx.traderCategoryShare.createMany({
        data: dto.shares.map((share) => ({
          seasonId: category.seasonId,
          traderCategoryId: dto.id,
          traderId: Number(share.traderId),
          percent: Number(share.percent),
        })),
      });
    });

    const updated = await this.prisma.tradersCategories.findUnique({
      where: { id: dto.id },
      include: {
        traderCategoryShares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: { select: { name: true } },
          },
        },
      },
    });

    if (!updated) {
      throw new NotFoundException('Updated category not found.');
    }

    return this.transformCategoryWithShares(updated);
  }

  async findAllWithSharesBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const categories = await this.prisma.tradersCategories.findMany({
      where: { seasonId },
      orderBy: { name: 'asc' },
      include: {
        traderCategoryShares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: { select: { name: true } },
          },
        },
      },
    });

    return categories.map((category) => this.transformCategoryWithShares(category));
  }

  // Find all categories for a specific season
  async findAllBySeason(seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    if (this.isManagerOrAbove(actor)) {
      return this.prisma.tradersCategories.findMany({
        where: { seasonId },
        orderBy: { name: 'asc' },
      });
    }

    const records = await this.prisma.tradersCategories.findMany({
      where: { seasonId },
      select: {
        id: true,
        name: true,
        notes: true,
      },
      orderBy: { name: 'asc' },
    });

    return records.map((record) => this.toWorkerCategoryView(record));
  }

  // Find one category by ID
  async findOne(id: number, actor: AuthenticatedUser) {
    const managerOrAbove = this.isManagerOrAbove(actor);

    const category = managerOrAbove
      ? await this.prisma.tradersCategories.findUnique({
          where: { id },
        })
      : await this.prisma.tradersCategories.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            notes: true,
          },
        });

    if (!category) throw new NotFoundException(`Category not found`);
    return managerOrAbove ? category : this.toWorkerCategoryView(category);
  }

  // Find one category by name and season
  async findByName(name: string, seasonId: number, actor: AuthenticatedUser) {
    await this.seasonsService.assertSeasonExists(seasonId);

    const managerOrAbove = this.isManagerOrAbove(actor);

    const category = managerOrAbove
      ? await this.prisma.tradersCategories.findUnique({
          where: {
            name_seasonId: { name, seasonId },
          },
        })
      : await this.prisma.tradersCategories.findUnique({
          where: {
            name_seasonId: { name, seasonId },
          },
          select: {
            id: true,
            name: true,
            notes: true,
          },
        });

    if (!category) throw new NotFoundException(`Category ${name} not found in this season`);
    return managerOrAbove ? category : this.toWorkerCategoryView(category);
  }

  // Update category details
  async update(id: number, data: Partial<Prisma.TradersCategoriesUpdateInput>) {
    return this.prisma.tradersCategories.update({
      where: { id },
      data,
    });
  }

  // Remove a category
  // Prisma will block this if there are classifications or stock linked to it
  async remove(id: number) {
    try {
      return await this.prisma.tradersCategories.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete trader category because related records exist in the system.');
      }

      throw error;
    }
  }
}