// src/israel/settings/services/sort-categories/sort-categories.service.ts

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Grade, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GradeGroup, validateGradeGroups } from 'src/categories/utils/trader-category-grade-groups.util';
import { normalizeIsraelSortCategoryName } from './utils/israel-sort-categories.utils';
import { ReorderIsraelSortCategoriesDto } from './dto/reorder-israel-sort-categories.dto';

@Injectable()
export class IsraelSortCategoriesService {
  constructor(private prisma: PrismaService) {}

  async getAllCategories() {
    return this.prisma.israelSortCategory.findMany({
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async addCategory(
    name: string,
    updatedById: number,
    supportedGrades: Grade[] = [],
    gradeGroups: GradeGroup[] = [],
    notes?: string,
  ) {
    const normalizedName = normalizeIsraelSortCategoryName(name);
    validateGradeGroups(gradeGroups, supportedGrades);

    try {
      return await this.prisma.israelSortCategory.create({
        data: {
          name: normalizedName,
          updatedById,
          supportedGrades,
          gradeGroups,
          notes,
        },
      });
    } catch (error) {
      throw new BadRequestException('Sorting category already exists');
    }
  }

  async removeCategory(id: number) {
    try {
      return await this.prisma.israelSortCategory.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete sorting category because related records exist in the system.');
      }

      throw error;
    }
  }

  async updateCategory(
    id: number,
    newName: string,
    updatedById: number,
    supportedGrades: Grade[] = [],
    gradeGroups: GradeGroup[] = [],
    notes?: string,
  ) {
    const normalizedName = normalizeIsraelSortCategoryName(newName);
    validateGradeGroups(gradeGroups, supportedGrades);

    try {
      return await this.prisma.israelSortCategory.update({
        where: { id },
        data: {
          name: normalizedName,
          updatedById,
          supportedGrades,
          gradeGroups,
          notes,
        },
      });
    } catch (error) {
      throw new BadRequestException('Sorting category update failed');
    }
  }

  // Persist a manual priority order for all Israel sorting categories.
  async reorder(dto: ReorderIsraelSortCategoriesDto) {
    const existing = await this.prisma.israelSortCategory.findMany({
      select: { id: true },
    });

    const existingIds = new Set(existing.map((category) => category.id));
    const uniqueOrderedIds = new Set(dto.orderedIds);

    if (
      uniqueOrderedIds.size !== dto.orderedIds.length ||
      uniqueOrderedIds.size !== existingIds.size ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException('orderedIds must contain exactly the set of existing sorting category IDs.');
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.israelSortCategory.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    return { orderedIds: dto.orderedIds };
  }
}
