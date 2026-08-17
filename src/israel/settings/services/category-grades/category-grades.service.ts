// src/israel/settings/services/category-grades/category-grades.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { SetIsraelCategoryGradeDto } from './dto/set-israel-category-grade.dto';
import { normalizeGradesMap } from './utils/israel-category-grades.utils';

const CATEGORY_SELECT = { category: { select: { id: true, name: true } } } as const;

@Injectable()
export class IsraelCategoryGradesService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  async getAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.israelCategoryGrade.findMany({
      where: { seasonId },
      include: CATEGORY_SELECT,
      orderBy: { category: { name: 'asc' } },
    });
  }

  async setForCategory(data: SetIsraelCategoryGradeDto, updatedById: number) {
    const { seasonId, categoryId } = data;
    await this.seasonsService.assertSeasonExists(seasonId);

    const category = await this.prisma.israelSortCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Israel sorting category #${categoryId} not found`);
    }

    const grades = normalizeGradesMap(data.grades);

    return this.prisma.israelCategoryGrade.upsert({
      where: { seasonId_categoryId: { seasonId, categoryId } },
      update: { grades, updatedById },
      create: { seasonId, categoryId, grades, updatedById },
      include: CATEGORY_SELECT,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.israelCategoryGrade.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Israel category grade set #${id} not found`);
    }

    return this.prisma.israelCategoryGrade.delete({ where: { id } });
  }
}
