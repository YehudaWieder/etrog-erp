// src/seasons/seasons.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeedService } from '../system-config/services/seed/seed.service';

@Injectable()
export class SeasonsService {
  constructor(
    private prisma: PrismaService,
    private seedService: SeedService,
  ) {}

  private mapDefaultTraderCategoryPreview(category: any) {
    let totalPercent = 0;

    const shares = (category.shares || []).map((share) => {
      const percent = Number(share.percent);
      totalPercent += percent;

      return {
        traderId: share.traderId,
        traderName: share.trader.name,
        percent,
      };
    });

    return {
      id: category.id,
      name: category.name,
      notes: category.notes,
      shares,
      totalPercent: Number(totalPercent.toFixed(2)),
    };
  }

  async previewSeasonCreation(yearName: number) {
    const existingSeason = await this.prisma.season.findUnique({
      where: { yearName },
      select: { id: true, yearName: true, slug: true, isActive: true },
    });

    const templates = await this.prisma.defaultTraderCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        shares: {
          orderBy: { traderId: 'asc' },
          include: {
            trader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const templateShares = templates.flatMap((category) => category.shares);
    const previewCategories = templates.map((category) =>
      this.mapDefaultTraderCategoryPreview(category),
    );

    return {
      canCreate: !existingSeason,
      yearName,
      existingSeason,
      defaults: {
        defaultTraderCategories: templates.length,
        defaultTraderCategoryShares: templateShares.length,
        categories: previewCategories,
      },
      projectedForNewSeason: {
        traderCategoriesToCreate: templates.length,
        traderSharesToCreate: templateShares.length,
        categories: previewCategories,
      },
    };
  }

  // Create a new season
  async createSeason(yearName: number) {
    // Check if season already exists
    const existing = await this.prisma.season.findUnique({
      where: { yearName },
    });
    if (existing) throw new ConflictException(`Season ${yearName} already exists`);

    return this.prisma.$transaction(async (tx) => {
      // Deactivate all other seasons
      await tx.season.updateMany({
        data: { isActive: false },
      });

      // Create new season
      const season = await tx.season.create({
        data: {
          yearName,
          slug: `${yearName}`,
          isActive: true,
        },
      });

      // Bootstrap default trader categories and shares
      await this.seedService.bootstrapDefaultsForSeason(season.id, tx);

      return season;
    });
  }

  // Get all seasons
  async findAll() {
    return this.prisma.season.findMany({
      orderBy: { yearName: 'desc' },
    });
  }

  async findActiveSeason() {
    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { yearName: 'desc' },
    });

    if (!activeSeason) throw new NotFoundException('Active season not found');
    return activeSeason;
  }

  // Get a single season by ID or Slug
  async findOne(idOrSlug: string | number) {
    const season = await this.prisma.season.findFirst({
      where: typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug },
    });

    if (!season) throw new NotFoundException(`Season not found`);
    return season;
  }

  // Set as active and deactivate all others
  async setActiveSeason(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // Deactivate all
      await tx.season.updateMany({
        data: { isActive: false },
      });

      // Activate the chosen one
      return tx.season.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  // Delete season (Only if no related data exists - Prisma will enforce this via foreign keys)
  async remove(id: number) {
    // Check if season exists
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        TradersCategories: {
          select: { id: true, isDefault: true },
        },
      },
    });

    if (!season) throw new NotFoundException('Season not found');

    // Check if there are manually added categories (isDefault: false)
    const manualCategories = season.TradersCategories.filter(
      (cat) => !cat.isDefault,
    );
    if (manualCategories.length > 0) {
      throw new ConflictException(
        'Cannot delete season with manually added categories. ' +
          'Please remove manual categories first or delete the season with only default categories.',
      );
    }

    // Delete all default categories and their shares, then the season
    return this.prisma.$transaction(async (tx) => {
      // Get all trader category IDs for this season
      const categories = await tx.tradersCategories.findMany({
        where: { seasonId: id },
        select: { id: true },
      });

      const categoryIds = categories.map((cat) => cat.id);

      // Delete all shares for these categories
      if (categoryIds.length > 0) {
        await tx.traderCategoryShare.deleteMany({
          where: { traderCategoryId: { in: categoryIds } },
        });

        // Delete all categories
        await tx.tradersCategories.deleteMany({
          where: { seasonId: id },
        });
      }

      // Finally delete the season
      return tx.season.delete({
        where: { id },
      });
    });
  }
}