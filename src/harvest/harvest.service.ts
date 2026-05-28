// src/harvest/harvest.service.ts

import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { calculateHarvestFields } from './harvest.utils';

type HarvestRowForOwnerFallback = {
  totalHarvested: number;
  totalRejected: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  ownerRejectionRate: Prisma.Decimal | number | null;
};

type FieldHarvestTotalsRow = {
  fieldId: number;
  fieldName: string;
  recordCount: number;
  totalHarvested: number;
  totalRejected: number;
  totalAfterRejected: number;
  classifiedTotal: number;
  rejectionRate: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  ownerRejectionRate: number;
  differenceHarvested: number;
  differenceRejected: number;
  differenceAfterRejected: number;
  differenceRejectionRate: number;
  hasOwnerOverrides: boolean;
  isPartialClassification: boolean;
};

type FieldHarvestReportDetails = FieldHarvestTotalsRow & {
  seasonName: string;
  rows: Array<{
    id: number;
    seasonId: number;
    fieldId: number;
    dateGregorian: Date;
    dateHebrew: string;
    totalHarvested: number;
    totalRejected: number;
    totalAfterRejected: number;
    ownerHarvested: number;
    ownerRejected: number;
    ownerAfterRejected: number;
    classifiedTotal: number;
    isPartialClassification: boolean;
    notes: string | null;
    updatedAt: Date;
    rejectionRate: Prisma.Decimal;
    ownerRejectionRate: Prisma.Decimal;
    field: { name: string };
    updatedBy: { name: string };
  }>;
};

@Injectable()
export class HarvestService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private hasExplicitOwnerData(row: HarvestRowForOwnerFallback): boolean {
    return (
      row.ownerHarvested > 0 ||
      row.ownerRejected > 0 ||
      row.ownerAfterRejected > 0 ||
      Number(row.ownerRejectionRate ?? 0) > 0
    );
  }

  private normalizeOwnerInputs(params: {
    totalHarvested: number;
    totalRejected: number;
    ownerHarvested?: number;
    ownerRejected?: number;
  }): { ownerHarvested: number; ownerRejected: number } {
    const ownerProvided = params.ownerHarvested !== undefined || params.ownerRejected !== undefined;

    if (!ownerProvided) {
      return {
        ownerHarvested: params.totalHarvested,
        ownerRejected: params.totalRejected,
      };
    }

    return {
      ownerHarvested: Number(params.ownerHarvested) || 0,
      ownerRejected: Number(params.ownerRejected) || 0,
    };
  }

  // Create a new harvest report
  async create(data: Prisma.FieldHarvestUncheckedCreateInput, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    // Generate unique slug: date-field-season
    const dateStr = new Date(data.dateGregorian).toISOString().split('T')[0];
    const slug = `${dateStr}-f${data.fieldId}-s${seasonId}`;

    const existing = await this.prisma.fieldHarvest.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('A report for this field and date already exists');

    const totalHarvested = Number(data.totalHarvested) || 0;
    const totalRejected = Number(data.totalRejected) || 0;
    const normalizedOwners = this.normalizeOwnerInputs({
      totalHarvested,
      totalRejected,
      ownerHarvested: data.ownerHarvested as number | undefined,
      ownerRejected: data.ownerRejected as number | undefined,
    });

    const rates = calculateHarvestFields({
      ...data,
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
    });

    return this.prisma.fieldHarvest.create({
      data: {
        ...data,
        updatedById: actorId,
        seasonId,
        slug,
        totalHarvested,
        totalRejected,
        ownerHarvested: normalizedOwners.ownerHarvested,
        ownerRejected: normalizedOwners.ownerRejected,
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

  async findFieldTotalsBySeason(seasonId: number): Promise<FieldHarvestTotalsRow[]> {
    await this.seasonsService.assertSeasonExists(seasonId);

    const rows = await this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      select: {
        fieldId: true,
        field: { select: { name: true } },
        totalHarvested: true,
        totalRejected: true,
        totalAfterRejected: true,
        classifiedTotal: true,
        rejectionRate: true,
        ownerHarvested: true,
        ownerRejected: true,
        ownerAfterRejected: true,
        ownerRejectionRate: true,
        isPartialClassification: true,
      },
    });

    const grouped = new Map<number, FieldHarvestTotalsRow>();

    for (const row of rows) {
      const fieldId = row.fieldId;
      const fieldName = row.field?.name ?? '-';

      if (!grouped.has(fieldId)) {
        grouped.set(fieldId, {
          fieldId,
          fieldName,
          recordCount: 0,
          totalHarvested: 0,
          totalRejected: 0,
          totalAfterRejected: 0,
          classifiedTotal: 0,
          rejectionRate: 0,
          ownerHarvested: 0,
          ownerRejected: 0,
          ownerAfterRejected: 0,
          ownerRejectionRate: 0,
          differenceHarvested: 0,
          differenceRejected: 0,
          differenceAfterRejected: 0,
          differenceRejectionRate: 0,
          hasOwnerOverrides: false,
          isPartialClassification: false,
        });
      }

      const target = grouped.get(fieldId)!;
      const hasExplicitOwnerData = this.hasExplicitOwnerData({
        totalHarvested: row.totalHarvested,
        totalRejected: row.totalRejected,
        ownerHarvested: row.ownerHarvested,
        ownerRejected: row.ownerRejected,
        ownerAfterRejected: row.ownerAfterRejected,
        ownerRejectionRate: row.ownerRejectionRate,
      });

      const effectiveOwnerHarvested = hasExplicitOwnerData ? row.ownerHarvested : row.totalHarvested;
      const effectiveOwnerRejected = hasExplicitOwnerData ? row.ownerRejected : row.totalRejected;
      const effectiveOwnerAfterRejected = hasExplicitOwnerData ? row.ownerAfterRejected : row.totalAfterRejected;
      const effectiveOwnerRejectionRate = hasExplicitOwnerData
        ? Number(row.ownerRejectionRate)
        : Number(row.rejectionRate);

      target.recordCount += 1;
      target.totalHarvested += row.totalHarvested;
      target.totalRejected += row.totalRejected;
      target.totalAfterRejected += row.totalAfterRejected;
      target.classifiedTotal += row.classifiedTotal;
      target.ownerHarvested += effectiveOwnerHarvested;
      target.ownerRejected += effectiveOwnerRejected;
      target.ownerAfterRejected += effectiveOwnerAfterRejected;
      target.ownerRejectionRate += effectiveOwnerRejectionRate;
      target.hasOwnerOverrides = target.hasOwnerOverrides || hasExplicitOwnerData;
      target.isPartialClassification = target.isPartialClassification || Boolean(row.isPartialClassification);
    }

    return Array.from(grouped.values())
      .map((row) => {
        const rejectionRate = row.totalHarvested > 0 ? (row.totalRejected / row.totalHarvested) * 100 : 0;
        const ownerRejectionRate = row.recordCount > 0 ? row.ownerRejectionRate / row.recordCount : 0;
        const differenceHarvested = row.totalHarvested - row.ownerHarvested;
        const differenceRejected = row.totalRejected - row.ownerRejected;
        const differenceAfterRejected = row.totalAfterRejected - row.ownerAfterRejected;
        const differenceRejectionRate = rejectionRate - ownerRejectionRate;

        return {
          ...row,
          rejectionRate,
          ownerRejectionRate,
          differenceHarvested,
          differenceRejected,
          differenceAfterRejected,
          differenceRejectionRate,
        };
      })
      .sort((a, b) => a.fieldName.localeCompare(b.fieldName, 'he', { sensitivity: 'base', numeric: true }));
  }

  async findFieldReportDetailsBySeasonAndField(seasonId: number, fieldId: number): Promise<FieldHarvestReportDetails> {
    await this.seasonsService.assertSeasonExists(seasonId);

    const [totals, season, rows] = await Promise.all([
      this.findFieldTotalsBySeason(seasonId),
      this.prisma.season.findUnique({ where: { id: seasonId }, select: { yearName: true } }),
      this.prisma.fieldHarvest.findMany({
        where: { seasonId, fieldId, isDeleted: false },
        include: {
          field: { select: { name: true } },
          updatedBy: { select: { name: true } },
        },
        orderBy: [{ dateGregorian: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const fieldTotals = totals.find((item) => item.fieldId === fieldId);
    if (!fieldTotals || rows.length === 0) {
      throw new NotFoundException(`No harvest records found for field ${fieldId} in season ${seasonId}`);
    }

    return {
      ...fieldTotals,
      seasonName: String(season?.yearName ?? ''),
      rows,
    };
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
    const totalHarvested = Number(mergedData.totalHarvested) || 0;
    const totalRejected = Number(mergedData.totalRejected) || 0;
    const ownerFieldsProvided = data.ownerHarvested !== undefined || data.ownerRejected !== undefined;
    const currentHasExplicitOwnerData = this.hasExplicitOwnerData({
      totalHarvested: current.totalHarvested,
      totalRejected: current.totalRejected,
      ownerHarvested: current.ownerHarvested,
      ownerRejected: current.ownerRejected,
      ownerAfterRejected: current.ownerAfterRejected,
      ownerRejectionRate: current.ownerRejectionRate,
    });

    const normalizedOwners = ownerFieldsProvided
      ? {
          ownerHarvested: Number(mergedData.ownerHarvested) || 0,
          ownerRejected: Number(mergedData.ownerRejected) || 0,
        }
      : currentHasExplicitOwnerData
        ? {
            ownerHarvested: Number(current.ownerHarvested) || 0,
            ownerRejected: Number(current.ownerRejected) || 0,
          }
        : {
            ownerHarvested: totalHarvested,
            ownerRejected: totalRejected,
          };

    const rates = calculateHarvestFields({
      totalHarvested,
      totalRejected,
      ownerHarvested: normalizedOwners.ownerHarvested,
      ownerRejected: normalizedOwners.ownerRejected,
      classifiedTotal: Number(mergedData.classifiedTotal) || 0,
      isPartialClassification: mergedData.isPartialClassification as boolean | undefined,
    });

    return this.prisma.fieldHarvest.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorId,
        totalHarvested,
        totalRejected,
        ownerHarvested: normalizedOwners.ownerHarvested,
        ownerRejected: normalizedOwners.ownerRejected,
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