// src/inventory/services/classification/classification.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class ClassificationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Create a new classification entry
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    // Generate unique slug to prevent duplicates based on your unique constraint
    const slug = `harvest-${data.fieldHarvestId}-tcat-${data.traderCategoryId ?? 0}-ccat-${data.customerCategoryId ?? 0}-g-${data.grade ?? 'NA'}-a-${data.assignmentType}`;

    const existing = await this.prisma.classification.findUnique({
      where: { slug },
    });
    
    if (existing) {
      if (existing.isDeleted) {
        // If it was soft-deleted, we "restore" and update it
        return this.update(existing.id, { ...data, seasonId, isDeleted: false });
      }
      throw new ConflictException('This classification combination already exists for this harvest');
    }

    return this.prisma.classification.create({
      data: {
        ...data,
        seasonId,
        slug,
      },
    });
  }

  // Get all classifications for a specific harvest report
  async findByHarvest(fieldHarvestId: number) {
    return this.prisma.classification.findMany({
      where: { fieldHarvestId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
      },
    });
  }

  // Get all classifications for a season
  async findAllBySeason(seasonId: number) {
    return this.prisma.classification.findMany({
      where: { seasonId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.classification.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Classification #${id} not found`);
    return record;
  }

  async update(id: number, data: Prisma.ClassificationUncheckedUpdateInput) {
    return this.prisma.classification.update({
      where: { id },
      data,
    });
  }

  // Soft Delete
  async remove(id: number) {
    const classification = await this.prisma.classification.findFirst({
      where: { id, isDeleted: false },
      include: {
        fieldHarvest: {
          select: {
            id: true,
            totalHarvested: true,
            totalRejected: true,
          },
        },
      },
    });

    if (!classification) {
      throw new NotFoundException(`Classification #${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert movements created from this classification.
      await tx.customerAllocation.deleteMany({
        where: { MovementReferenceId: id },
      });

      await tx.traderStock.deleteMany({
        where: { MovementReferenceId: id },
      });

      const nextTotalHarvested = Math.max(
        0,
        (classification.fieldHarvest?.totalHarvested ?? 0) - classification.quantity,
      );

      await tx.fieldHarvest.update({
        where: { id: classification.fieldHarvestId },
        data: {
          totalHarvested: nextTotalHarvested,
          rejectionRate:
            nextTotalHarvested > 0
              ? ((classification.fieldHarvest?.totalRejected ?? 0) / nextTotalHarvested) * 100
              : 0,
        },
      });

      return tx.classification.update({
        where: { id },
        data: { isDeleted: true },
      });
    });
  }
}
