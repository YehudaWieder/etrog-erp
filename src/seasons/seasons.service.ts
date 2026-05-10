// src/seasons/seasons.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

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

      return tx.season.create({
        data: {
          yearName,
          slug: `${yearName}`,
          isActive: true,
        },
      });
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