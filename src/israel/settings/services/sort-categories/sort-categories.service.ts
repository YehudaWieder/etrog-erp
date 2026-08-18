// src/israel/settings/services/sort-categories/sort-categories.service.ts

import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Grade, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GradeGroup, validateGradeGroups } from 'src/categories/utils/trader-category-grade-groups.util';
import { normalizeIsraelSortCategoryName } from './utils/israel-sort-categories.utils';

@Injectable()
export class IsraelSortCategoriesService {
  constructor(private prisma: PrismaService) {}

  async getAllCategories() {
    return this.prisma.israelSortCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async addCategory(
    name: string,
    updatedById: number,
    supportedGrades: Grade[] = [],
    gradeGroups: GradeGroup[] = [],
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
        },
      });
    } catch (error) {
      throw new BadRequestException('Sorting category update failed');
    }
  }
}
