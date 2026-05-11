// src/categories/services/traders-cat/traders-cat.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class TradersCatService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

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
    return this.prisma.tradersCategories.delete({
      where: { id },
    });
  }
}