// src/israel/settings/services/field-categories/field-categories.service.ts

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { CreateIsraelFieldCategoryDto } from './dto/create-israel-field-category.dto';
import { UpdateIsraelFieldCategoryDto } from './dto/update-israel-field-category.dto';
import { normalizeIsraelFieldCategoryName } from './utils/israel-field-categories.utils';

const FIELD_SELECT = { field: { select: { id: true, name: true } } } as const;

@Injectable()
export class IsraelFieldCategoriesService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  async getAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.israelFieldCategory.findMany({
      where: { seasonId },
      include: FIELD_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async addCategory(data: CreateIsraelFieldCategoryDto, updatedById: number) {
    const { seasonId, fieldId } = data;
    await this.seasonsService.assertSeasonExists(seasonId);

    const field = await this.prisma.israelField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException(`Israel field #${fieldId} not found`);
    }

    const normalizedName = normalizeIsraelFieldCategoryName(data.name);

    const existing = await this.prisma.israelFieldCategory.findUnique({
      where: { seasonId_fieldId_name: { seasonId, fieldId, name: normalizedName } },
    });
    if (existing) {
      throw new ConflictException(`Category "${normalizedName}" already exists for this seller in this season`);
    }

    return this.prisma.israelFieldCategory.create({
      data: {
        seasonId,
        fieldId,
        name: normalizedName,
        price: data.price,
        currency: data.currency,
        updatedById,
      },
      include: FIELD_SELECT,
    });
  }

  async updateCategory(id: number, data: UpdateIsraelFieldCategoryDto, updatedById: number) {
    const existing = await this.prisma.israelFieldCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Israel field category #${id} not found`);
    }

    const normalizedName = normalizeIsraelFieldCategoryName(data.name);

    if (normalizedName !== existing.name) {
      const clash = await this.prisma.israelFieldCategory.findUnique({
        where: {
          seasonId_fieldId_name: {
            seasonId: existing.seasonId,
            fieldId: existing.fieldId,
            name: normalizedName,
          },
        },
      });
      if (clash) {
        throw new ConflictException(`Category "${normalizedName}" already exists for this seller in this season`);
      }
    }

    return this.prisma.israelFieldCategory.update({
      where: { id },
      data: {
        name: normalizedName,
        price: data.price,
        currency: data.currency,
        updatedById,
      },
      include: FIELD_SELECT,
    });
  }

  async removeCategory(id: number) {
    try {
      return await this.prisma.israelFieldCategory.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete category because related records exist in the system.');
      }

      throw error;
    }
  }
}
