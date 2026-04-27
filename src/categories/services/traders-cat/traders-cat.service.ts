// src/categories/services/traders-cat/traders-cat.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class TradersCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Create a new category for a specific season
  async create(_seasonId: number, name: string, notes?: string) {
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

  // Find all categories for a specific season
  async findAllBySeason(seasonId: number) {
    return this.prisma.tradersCategories.findMany({
      where: { seasonId },
      orderBy: { name: 'asc' },
    });
  }

  // Find one category by ID
  async findOne(id: number) {
    const category = await this.prisma.tradersCategories.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException(`Category not found`);
    return category;
  }

  // Find one category by name and season
  async findByName(name: string, seasonId: number) {
    const category = await this.prisma.tradersCategories.findUnique({
        where: {
        name_seasonId: { name, seasonId },
        },
    });
    if (!category) throw new NotFoundException(`Category ${name} not found in this season`);
    return category;
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
    return this.prisma.tradersCategories.delete({
      where: { id },
    });
  }
}