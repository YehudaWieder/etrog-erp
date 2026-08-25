import { Injectable } from '@nestjs/common';
import { ShipmentStatus, IsraelMovementType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { addToPitamMatrix, categoriesUsedIn, flattenPitamMatrix, gradesUsedIn, pct, type PitamGradeCell, type PitamMatrix, type PitamStatusLike } from '../../dashboard/pitam-matrix.util';

type DailyDataPoint = { label: string; value: number };
type MetricGauge = { value: number; percent: number };

export type FieldSummaryBucket = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  fieldCategoryNames?: string[];
  byFieldCategory?: Record<string, FieldSummaryBucket>;
};
type FieldSummaryGroup = { general: FieldSummaryBucket; byField: Record<string, FieldSummaryBucket>; fieldNames: string[] };
type SummaryItem = { quantity: number; grade: string; pitamStatus: PitamStatusLike; categoryName: string; fieldName: string | null; fieldCategoryName?: string | null };

@Injectable()
export class IsraelDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDailySeries<T extends { quantity: number }>(records: Array<T & { date: Date }>): DailyDataPoint[] {
    const byDate = new Map<string, number>();
    for (const r of records) {
      const key = r.date.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? 0) + r.quantity);
    }
    let cumulative = 0;
    return Array.from(byDate.keys())
      .sort()
      .map((d, i) => {
        cumulative += byDate.get(d)!;
        return { label: `יום ${i + 1}`, value: cumulative };
      });
  }

  private async buildHarvestSeries(seasonId: number): Promise<DailyDataPoint[]> {
    const records = await this.prisma.israelHarvest.findMany({
      where: { seasonId },
      select: { dateGregorian: true, quantity: true },
      orderBy: { dateGregorian: 'asc' },
    });
    return this.buildDailySeries(records.map((r) => ({ date: r.dateGregorian, quantity: r.quantity })));
  }

  private async buildSortedSeries(seasonId: number): Promise<DailyDataPoint[]> {
    const records = await this.prisma.israelClassification.findMany({
      where: { seasonId },
      select: { createdAt: true, quantity: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.buildDailySeries(records.map((r) => ({ date: r.createdAt, quantity: r.quantity })));
  }

  private async buildPackagedSeries(seasonId: number): Promise<DailyDataPoint[]> {
    const records = await this.prisma.israelShipmentItem.findMany({
      where: { seasonId },
      select: { createdAt: true, quantity: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.buildDailySeries(records.map((r) => ({ date: r.createdAt, quantity: r.quantity })));
  }

  // Builds a {general, byField, fieldNames} group from a flat list of category/grade/pitam items
  // that each optionally carry the seller/field they came from - shared by sortingSummary and
  // each shipmentsSummary status bucket so both get the same "by seller" breakdown as inventory.
  private buildFieldSummaryGroup(
    items: SummaryItem[],
    categoryOrder: string[],
    allFields: { name: string }[],
    fieldCategoriesByField?: Map<string, string[]>,
  ): FieldSummaryGroup {
    const generalMatrix: PitamMatrix = new Map();
    let generalTotal = 0;
    const perField = new Map<string, { total: number; matrix: PitamMatrix; byFieldCategory: Map<string, { total: number; matrix: PitamMatrix }> }>();

    for (const item of items) {
      if (item.quantity <= 0) continue;
      addToPitamMatrix(generalMatrix, item.categoryName, item.grade, item.pitamStatus, item.quantity);
      generalTotal += item.quantity;
      if (item.fieldName != null) {
        if (!perField.has(item.fieldName)) perField.set(item.fieldName, { total: 0, matrix: new Map(), byFieldCategory: new Map() });
        const entry = perField.get(item.fieldName)!;
        entry.total += item.quantity;
        addToPitamMatrix(entry.matrix, item.categoryName, item.grade, item.pitamStatus, item.quantity);

        if (item.fieldCategoryName != null) {
          if (!entry.byFieldCategory.has(item.fieldCategoryName)) entry.byFieldCategory.set(item.fieldCategoryName, { total: 0, matrix: new Map() });
          const catEntry = entry.byFieldCategory.get(item.fieldCategoryName)!;
          catEntry.total += item.quantity;
          addToPitamMatrix(catEntry.matrix, item.categoryName, item.grade, item.pitamStatus, item.quantity);
        }
      }
    }

    const fieldNames: string[] = [];
    const byField: Record<string, FieldSummaryBucket> = {};
    for (const field of allFields) {
      fieldNames.push(field.name);
      const entry = perField.get(field.name);
      const allFieldCategoryNames = fieldCategoriesByField?.get(field.name) ?? [];
      const fieldCategoryNames = allFieldCategoryNames.filter((catName) => (entry?.byFieldCategory.get(catName)?.total ?? 0) > 0);
      const fieldCategoryExtras: Pick<FieldSummaryBucket, 'fieldCategoryNames' | 'byFieldCategory'> = fieldCategoryNames.length
        ? {
            fieldCategoryNames,
            byFieldCategory: Object.fromEntries(
              fieldCategoryNames.map((catName) => {
                const catEntry = entry!.byFieldCategory.get(catName)!;
                return [
                  catName,
                  {
                    total: catEntry.total,
                    categories: categoriesUsedIn(catEntry.matrix, categoryOrder),
                    grades: gradesUsedIn(catEntry.matrix),
                    matrix: flattenPitamMatrix(catEntry.matrix),
                  },
                ];
              }),
            ),
          }
        : {};
      byField[field.name] = entry
        ? {
            total: entry.total,
            categories: categoriesUsedIn(entry.matrix, categoryOrder),
            grades: gradesUsedIn(entry.matrix),
            matrix: flattenPitamMatrix(entry.matrix),
            ...fieldCategoryExtras,
          }
        : { total: 0, categories: [], grades: [], matrix: {}, ...fieldCategoryExtras };
    }

    return {
      general: {
        total: generalTotal,
        categories: categoriesUsedIn(generalMatrix, categoryOrder),
        grades: gradesUsedIn(generalMatrix),
        matrix: flattenPitamMatrix(generalMatrix),
      },
      byField,
      fieldNames,
    };
  }

  async getDashboardData(seasonId: number) {
    const currentSeason = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { yearName: true },
    });

    const prevSeasons = currentSeason
      ? await this.prisma.season.findMany({
          where: { yearName: { lt: currentSeason.yearName } },
          orderBy: { yearName: 'desc' },
          take: 2,
          select: { id: true, yearName: true },
        })
      : [];

    const [netHarvestHistory, sortedHistory, packagedHistory] = await Promise.all([
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildHarvestSeries(s.id) }))),
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildSortedSeries(s.id) }))),
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildPackagedSeries(s.id) }))),
    ]);

    const [netHarvest, sorted, packagedSeries] = await Promise.all([
      this.buildHarvestSeries(seasonId),
      this.buildSortedSeries(seasonId),
      this.buildPackagedSeries(seasonId),
    ]);

    const [allFields, categoryOrderRecords, fieldCategoryRecords, harvestAgg, classificationRecords, shipmentItemRecords, shipmentRecords, stockRecords, selfPickupAgg] =
      await Promise.all([
        this.prisma.israelField.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        this.prisma.israelSortCategory.findMany({
          select: { name: true },
          orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.israelFieldCategory.findMany({
          where: { seasonId },
          select: { name: true, field: { select: { name: true } } },
          orderBy: { name: 'asc' },
        }),
        this.prisma.israelHarvest.aggregate({ where: { seasonId }, _sum: { quantity: true } }),
        this.prisma.israelClassification.findMany({
          where: { seasonId },
          select: {
            quantity: true,
            grade: true,
            pitamStatus: true,
            category: { select: { name: true } },
            harvest: { select: { field: { select: { name: true } } } },
            fieldCategory: { select: { name: true } },
          },
        }),
        this.prisma.israelShipmentItem.findMany({
          where: { seasonId },
          select: {
            quantity: true,
            grade: true,
            pitamStatus: true,
            category: { select: { name: true } },
            box: { select: { field: { select: { name: true } }, shipment: { select: { status: true } } } },
          },
        }),
        this.prisma.israelShipment.findMany({
          where: { seasonId },
          select: { totalQuantity: true, status: true },
        }),
        // "Full" inventory that exists this season - deliberately excludes PACKED_SHIPPED and
        // SELF_PICKUP movement rows so it isn't netted down by what already left, unlike a live
        // stock-on-hand balance. WASTE/ADJUSTMENT still apply.
        this.prisma.israelStock.findMany({
          where: {
            seasonId,
            isDeleted: false,
            type: { notIn: [IsraelMovementType.PACKED_SHIPPED, IsraelMovementType.SELF_PICKUP] },
          },
          select: {
            quantity: true,
            grade: true,
            pitamStatus: true,
            fieldId: true,
            field: { select: { name: true } },
            category: { select: { name: true } },
          },
        }),
        this.prisma.israelStock.aggregate({
          where: { seasonId, isDeleted: false, type: IsraelMovementType.SELF_PICKUP },
          _sum: { quantity: true },
        }),
      ]);

    const categoryOrder = categoryOrderRecords.map((c) => c.name);
    const grandHarvest = harvestAgg._sum.quantity ?? 0;

    const fieldCategoriesByField = new Map<string, string[]>();
    for (const fc of fieldCategoryRecords) {
      const list = fieldCategoriesByField.get(fc.field.name) ?? [];
      list.push(fc.name);
      fieldCategoriesByField.set(fc.field.name, list);
    }

    // --- sortingSummary: category x grade x pitam breakdown of what was sorted, plus by-seller split ---
    const sortingItems: SummaryItem[] = classificationRecords.map((r) => ({
      quantity: r.quantity,
      grade: r.grade ?? 'ללא',
      pitamStatus: r.pitamStatus,
      categoryName: r.category.name,
      fieldName: r.harvest.field.name,
      fieldCategoryName: r.fieldCategory.name,
    }));
    const sortingGroup = this.buildFieldSummaryGroup(sortingItems, categoryOrder, allFields, fieldCategoriesByField);
    const grandSorted = classificationRecords.reduce((sum, r) => sum + r.quantity, 0);

    // --- shipmentsSummary: packaged/shipped/delivered status funnel, each with a by-seller split ---
    const packagedItems: SummaryItem[] = [];
    const shippedItems: SummaryItem[] = [];
    const deliveredItems: SummaryItem[] = [];

    for (const item of shipmentItemRecords) {
      const status = item.box.shipment?.status;
      const summaryItem: SummaryItem = {
        quantity: item.quantity,
        grade: item.grade,
        pitamStatus: item.pitamStatus,
        categoryName: item.category.name,
        fieldName: item.box.field.name,
      };
      packagedItems.push(summaryItem);
      if (status === ShipmentStatus.SHIPPED || status === ShipmentStatus.DELIVERED) shippedItems.push(summaryItem);
      if (status === ShipmentStatus.DELIVERED) deliveredItems.push(summaryItem);
    }

    const packagedGroup = this.buildFieldSummaryGroup(packagedItems, categoryOrder, allFields);
    const shippedGroup = this.buildFieldSummaryGroup(shippedItems, categoryOrder, allFields);
    const deliveredGroup = this.buildFieldSummaryGroup(deliveredItems, categoryOrder, allFields);

    let shipped = 0;
    let delivered = 0;
    const packaged = packagedGroup.general.total;
    for (const s of shipmentRecords) {
      if (s.status === ShipmentStatus.SHIPPED || s.status === ShipmentStatus.DELIVERED) shipped += s.totalQuantity;
      if (s.status === ShipmentStatus.DELIVERED) delivered += s.totalQuantity;
    }

    const selfPickupTotal = Math.abs(selfPickupAgg._sum.quantity ?? 0);

    // --- inventorySummary + fieldDistribution + categoryDistribution: full inventory (see stockRecords query above) ---
    const generalMatrix: PitamMatrix = new Map();
    let generalTotal = 0;
    const fieldTotals = new Map<number, { name: string; total: number; matrix: PitamMatrix; byCategory: Map<string, number> }>();
    const categoryTotals = new Map<string, number>();
    const categoryToField = new Map<string, Map<string, number>>();

    for (const r of stockRecords) {
      addToPitamMatrix(generalMatrix, r.category.name, r.grade ?? 'ללא', r.pitamStatus, r.quantity);
      generalTotal += r.quantity;
      categoryTotals.set(r.category.name, (categoryTotals.get(r.category.name) ?? 0) + r.quantity);

      if (r.fieldId != null && r.field) {
        if (!fieldTotals.has(r.fieldId)) {
          fieldTotals.set(r.fieldId, { name: r.field.name, total: 0, matrix: new Map(), byCategory: new Map() });
        }
        const entry = fieldTotals.get(r.fieldId)!;
        entry.total += r.quantity;
        entry.byCategory.set(r.category.name, (entry.byCategory.get(r.category.name) ?? 0) + r.quantity);
        addToPitamMatrix(entry.matrix, r.category.name, r.grade ?? 'ללא', r.pitamStatus, r.quantity);

        if (!categoryToField.has(r.category.name)) categoryToField.set(r.category.name, new Map());
        const catFieldMap = categoryToField.get(r.category.name)!;
        catFieldMap.set(r.field.name, (catFieldMap.get(r.field.name) ?? 0) + r.quantity);
      }
    }

    const fieldDistributionGeneral: DailyDataPoint[] = [];
    const byField: Record<string, DailyDataPoint[]> = {};
    const fieldNames: string[] = [];
    const inventoryByField: Record<string, FieldSummaryBucket> = {};

    for (const field of allFields) {
      const entry = fieldTotals.get(field.id);
      fieldNames.push(field.name);
      if (entry && entry.total > 0) {
        fieldDistributionGeneral.push({ label: field.name, value: entry.total });
      }
      byField[field.name] = entry
        ? Array.from(entry.byCategory.entries())
            .filter(([, v]) => v > 0)
            .map(([cat, qty]) => ({ label: cat, value: qty }))
        : [];
      inventoryByField[field.name] = entry
        ? {
            total: entry.total,
            categories: categoriesUsedIn(entry.matrix, categoryOrder),
            grades: gradesUsedIn(entry.matrix),
            matrix: flattenPitamMatrix(entry.matrix),
          }
        : { total: 0, categories: [], grades: [], matrix: {} };
    }

    const categoryNames = categoryOrderRecords.map((c) => c.name);
    const categoryDistributionGeneral: DailyDataPoint[] = categoryNames
      .map((cat) => ({ label: cat, value: categoryTotals.get(cat) ?? 0 }))
      .filter((bar) => bar.value > 0);
    const categoryDistributionByCategory: Record<string, DailyDataPoint[]> = {};
    for (const cat of categoryNames) {
      const fieldMap = categoryToField.get(cat);
      categoryDistributionByCategory[cat] = fieldMap
        ? Array.from(fieldMap.entries())
            .filter(([, v]) => v > 0)
            .map(([fieldName, qty]) => ({ label: fieldName, value: qty }))
        : [];
    }

    // Packaged/shipped/delivered gauges track what left the field via the packing/shipment
    // pipeline; self-pickup stock leaves inventory directly and never enters it, so it's
    // excluded from the shippable-base denominator, same as Italy's netAvailableForShipping.
    const shippableBase = grandHarvest - selfPickupTotal;

    const metrics: Record<string, MetricGauge> = {
      harvest: { value: grandHarvest, percent: 100 },
      sorted: { value: grandSorted, percent: pct(grandSorted, grandHarvest) },
      packaged: { value: packaged, percent: pct(packaged, shippableBase) },
      shipped: { value: shipped, percent: pct(shipped, shippableBase) },
      delivered: { value: delivered, percent: pct(delivered, shippableBase) },
      selfPickup: { value: selfPickupTotal, percent: pct(selfPickupTotal, grandHarvest) },
    };

    return {
      production: {
        netHarvest,
        netHarvestHistory,
        sorted,
        sortedHistory,
        packaged: packagedSeries,
        packagedHistory,
      },
      fieldDistribution: {
        general: fieldDistributionGeneral,
        byField,
        fieldNames,
      },
      categoryDistribution: {
        general: categoryDistributionGeneral,
        byCategory: categoryDistributionByCategory,
        categoryNames,
      },
      sortingSummary: {
        netHarvest: grandHarvest,
        general: sortingGroup.general,
        byField: sortingGroup.byField,
        fieldNames: sortingGroup.fieldNames,
      },
      shipmentsSummary: {
        packaged: packagedGroup,
        shipped: shippedGroup,
        delivered: deliveredGroup,
        selfPickupTotal,
      },
      inventorySummary: {
        general: {
          total: generalTotal,
          categories: categoriesUsedIn(generalMatrix, categoryOrder),
          grades: gradesUsedIn(generalMatrix),
          matrix: flattenPitamMatrix(generalMatrix),
        },
        byField: inventoryByField,
        fieldNames,
      },
      metrics,
    };
  }
}
