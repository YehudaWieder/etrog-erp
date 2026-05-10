// src/seasons/seasons.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async previewSeasonCreation(yearName: number) {
    const existingSeason = await this.prisma.season.findUnique({
      where: { yearName },
      select: { id: true, yearName: true, slug: true, isActive: true },
    });

    const templates = await this.prisma.traderCategoryTemplate.findMany({
      select: { id: true },
    });

    const templateShares = await this.prisma.traderCategoryShareTemplate.findMany({
      select: {
        id: true,
        traderId: true,
        traderCategoryTemplateId: true,
      },
    });

    return {
      canCreate: !existingSeason,
      yearName,
      existingSeason,
      defaults: {
        traderCategoryTemplates: templates.length,
        traderCategoryShareTemplates: templateShares.length,
      },
      projectedForNewSeason: {
        traderCategoriesToCreate: templates.length,
        traderSharesToCreate: templateShares.length,
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
      await tx.season.updateMany({
        data: { isActive: false },
      });

      const season = await tx.season.create({
        data: {
          yearName,
          slug: `${yearName}`,
          isActive: true,
        },
      });

      const templates = await tx.traderCategoryTemplate.findMany({
        orderBy: { name: 'asc' },
      });

      const templateToSeasonCategoryId = new Map<number, number>();

      for (const template of templates) {
        const createdCategory = await tx.tradersCategories.create({
          data: {
            seasonId: season.id,
            name: template.name,
            notes: template.notes,
          },
        });

        templateToSeasonCategoryId.set(template.id, createdCategory.id);
      }

      const shareTemplates = await tx.traderCategoryShareTemplate.findMany({
        orderBy: [{ traderCategoryTemplateId: 'asc' }, { traderId: 'asc' }],
      });

      for (const templateShare of shareTemplates) {
        const seasonCategoryId = templateToSeasonCategoryId.get(templateShare.traderCategoryTemplateId);
        if (!seasonCategoryId) {
          continue;
        }

        await tx.traderCategoryShare.create({
          data: {
            seasonId: season.id,
            traderId: templateShare.traderId,
            traderCategoryId: seasonCategoryId,
            percent: templateShare.percent,
          },
        });
      }

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
    return this.prisma.season.delete({
      where: { id },
    });
  }
}