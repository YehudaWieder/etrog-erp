import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { HarvestRepository } from 'src/harvest/services/harvest-core/repositories/harvest.repository';
import { SeasonsService } from 'src/seasons/seasons.service';

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
export class HarvestQueryService {
  constructor(
    private readonly harvestRepository: HarvestRepository,
    private readonly seasonsService: SeasonsService,
  ) {}

  private hasExplicitOwnerData(row: HarvestRowForOwnerFallback): boolean {
    return (
      row.ownerHarvested > 0 ||
      row.ownerRejected > 0 ||
      row.ownerAfterRejected > 0 ||
      Number(row.ownerRejectionRate ?? 0) > 0
    );
  }

  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);
    return this.harvestRepository.findAllBySeason(seasonId);
  }

  async findFieldTotalsBySeason(seasonId: number): Promise<FieldHarvestTotalsRow[]> {
    await this.seasonsService.assertSeasonExists(seasonId);

    const rows = await this.harvestRepository.findRowsForFieldTotals(seasonId);
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

  async findFieldReportDetailsBySeasonAndField(
    seasonId: number,
    fieldId: number,
  ): Promise<FieldHarvestReportDetails> {
    await this.seasonsService.assertSeasonExists(seasonId);

    const [totals, season, rows] = await Promise.all([
      this.findFieldTotalsBySeason(seasonId),
      this.harvestRepository.findSeasonName(seasonId),
      this.harvestRepository.findBySeasonAndField(seasonId, fieldId),
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

  async findOne(id: number) {
    const report = await this.harvestRepository.findOneWithRelations(id);
    if (!report) throw new NotFoundException(`Harvest report #${id} not found`);
    return report;
  }

  findByFieldNameAndDate(fieldName: string, date: string) {
    return this.harvestRepository.findByFieldNameAndDate(fieldName, new Date(date));
  }
}
