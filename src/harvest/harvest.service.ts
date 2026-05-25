// src/harvest/harvest.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { calculateHarvestFields } from './harvest.utils';

@Injectable()
export class HarvestService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  // Create a new harvest report
  async create(data: Prisma.FieldHarvestUncheckedCreateInput, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    // Generate unique slug: date-field-season
    const dateStr = new Date(data.dateGregorian).toISOString().split('T')[0];
    const slug = `${dateStr}-f${data.fieldId}-s${seasonId}`;

    const existing = await this.prisma.fieldHarvest.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A report for this field and date already exists');

    const rates = calculateHarvestFields(data);

    return this.prisma.fieldHarvest.create({
      data: {
        ...data,
        updatedById: actorId,
        seasonId,
        slug,
        ...rates,
      },
    });
  }

  // Get all reports for a season (excluding soft-deleted)
  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      include: {
        field: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
      orderBy: { dateGregorian: 'desc' },
    });
  }

  // Get single report
  async findOne(id: number) {
    const report = await this.prisma.fieldHarvest.findFirst({
      where: { id, isDeleted: false },
      include: {
        field: true,
        classifications: true,
      },
    });
    if (!report) throw new NotFoundException(`Harvest report #${id} not found`);
    return report;
  }

  // Get report by field name and date
  async findByFieldNameAndDate(fieldName: string, date: string) {
    return this.prisma.fieldHarvest.findFirst({
      where: {
        field: { name: fieldName },
        dateGregorian: new Date(date),
        isDeleted: false,
      },
      include: {
        field: true,
        classifications: true,
      },
    });
  }

  // Update report
  async update(id: number, data: Prisma.FieldHarvestUncheckedUpdateInput, actorId: number) {
    const current = await this.findOne(id);
    
    // Merge current and new data for rate calculation
    const mergedData = { ...current, ...data };
    const rates = calculateHarvestFields({
      totalHarvested: Number(mergedData.totalHarvested) || 0,
      totalRejected: Number(mergedData.totalRejected) || 0,
      ownerHarvested: Number(mergedData.ownerHarvested) || 0,
      ownerRejected: Number(mergedData.ownerRejected) || 0,
      classifiedTotal: Number(mergedData.classifiedTotal) || 0,
      isPartialClassification: mergedData.isPartialClassification as boolean | undefined,
    });

    return this.prisma.fieldHarvest.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorId,
        ...rates,
      },
    });
  }

  // Update partial/final classification mode with immediate consistency validation
  async updatePartialClassificationMode(id: number, isPartialClassification: boolean) {
    const harvest = await this.prisma.fieldHarvest.findUnique({
      where: { id },
      select: {
        id: true,
        totalAfterRejected: true,
        classifiedTotal: true,
      },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    const netHarvested = harvest.totalAfterRejected;

    if (!isPartialClassification && harvest.classifiedTotal !== netHarvested) {
      throw new BadRequestException(
        `Cannot switch to FINAL classification mode. classifiedTotal (${harvest.classifiedTotal}) must equal net harvested (${netHarvested}).`,
      );
    }

    return this.prisma.fieldHarvest.update({
      where: { id },
      data: {
        isPartialClassification,
      },
    });
  }

  // Hard delete with cascading cleanup of classifications and movements
  async remove(id: number) {
    const harvest = await this.prisma.fieldHarvest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!harvest) {
      throw new NotFoundException(`Harvest report #${id} not found`);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const classificationIds = await tx.classification.findMany({
          where: { fieldHarvestId: id },
          select: { id: true },
        });

        const ids = classificationIds.map((item) => item.id);

        if (ids.length > 0) {
          await tx.customerAllocation.deleteMany({
            where: { MovementReferenceId: { in: ids } },
          });

          await tx.traderStock.deleteMany({
            where: { MovementReferenceId: { in: ids } },
          });

          await tx.classification.deleteMany({
            where: { id: { in: ids } },
          });
        }

        return tx.fieldHarvest.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete harvest report because related records exist in the system.');
      }

      throw error;
    }
  }
}