// src/inventory/services/classification/classification.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { HarvestBulkService } from 'src/harvest/harvest-bulk.service';
import { ClassificationBulkItemDto } from 'src/docs/dto/swagger-enums.dto';

@Injectable()
export class ClassificationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private harvestBulkService: HarvestBulkService,
  ) {}

  // Create a new classification entry with automatic allocation to traders/customers
  async create(data: Prisma.ClassificationUncheckedCreateInput) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const slug = `harvest-${data.fieldHarvestId}-tcat-${data.traderCategoryId ?? 0}-ccat-${data.customerCategoryId ?? 0}-g-${data.grade ?? 'NA'}-pitam-${data.pitamStatus}-a-${data.assignmentType}`;

    const existing = await this.prisma.classification.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('This classification combination already exists for this harvest');
    }

    return this.prisma.$transaction(async (tx) => {
      const harvest = await tx.fieldHarvest.findUnique({
        where: { id: Number(data.fieldHarvestId) },
        select: { id: true, dateGregorian: true, updatedById: true },
      });

      if (!harvest) {
        throw new NotFoundException(`FieldHarvest #${data.fieldHarvestId} not found`);
      }

      const classification = await tx.classification.create({
        data: {
          ...data,
          seasonId,
          slug,
        },
      });

      const classificationItem: ClassificationBulkItemDto = {
        assignmentType: classification.assignmentType,
        traderId: classification.traderId ?? undefined,
        customerId: classification.customerId ?? undefined,
        traderCategoryId: classification.traderCategoryId ?? undefined,
        customerCategoryId: classification.customerCategoryId ?? undefined,
        grade: classification.grade ?? undefined,
        pitamStatus: classification.pitamStatus,
        quantity: classification.quantity,
        notes: classification.notes ?? undefined,
      };

      await this.harvestBulkService.processAllocationsForClassification(tx, {
        seasonId,
        classificationId: classification.id,
        classificationItem,
        harvestDate: harvest.dateGregorian,
        updatedById: Number(data.updatedById),
      });

      return classification;
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

  // Hard delete with rollback of linked movements and harvest total update
  async remove(id: number) {
    const classification = await this.prisma.classification.findFirst({
      where: { id },
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

      return tx.classification.delete({
        where: { id },
      });
    });
  }
}
