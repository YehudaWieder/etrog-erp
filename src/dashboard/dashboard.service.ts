import { Injectable } from '@nestjs/common';
import { ItemOwnership, MovementType, ShipmentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DailyDataPoint = { label: string; value: number };

type MetricGauge = { value: number; percent: number };

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildHarvestFieldSeries(seasonId: number, field: 'totalAfterRejected' | 'classifiedTotal'): Promise<DailyDataPoint[]> {
    const records = await this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      select: { dateGregorian: true, totalAfterRejected: true, classifiedTotal: true },
      orderBy: { dateGregorian: 'asc' },
    });
    const byDate = new Map<string, number>();
    for (const r of records) {
      const key = r.dateGregorian.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? 0) + r[field]);
    }
    let cumulative = 0;
    return Array.from(byDate.keys())
      .sort()
      .map((d, i) => {
        cumulative += byDate.get(d)!;
        return { label: `יום ${i + 1}`, value: cumulative };
      });
  }

  private async buildPackagedSeries(seasonId: number): Promise<DailyDataPoint[]> {
    const records = await this.prisma.shipmentItem.findMany({
      where: { seasonId, isDeleted: false },
      select: { createdAt: true, quantity: true },
      orderBy: { createdAt: 'asc' },
    });
    const byDate = new Map<string, number>();
    for (const r of records) {
      const key = r.createdAt.toISOString().split('T')[0];
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
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildHarvestFieldSeries(s.id, 'totalAfterRejected') }))),
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildHarvestFieldSeries(s.id, 'classifiedTotal') }))),
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildPackagedSeries(s.id) }))),
    ]);

    const records = await this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      select: {
        dateGregorian: true,
        totalHarvested: true,
        totalRejected: true,
        totalAfterRejected: true,
        classifiedTotal: true,
        field: { select: { includeInRejectionSummary: true } },
      },
      orderBy: { dateGregorian: 'asc' },
    });

    const byDate = new Map<
      string,
      { totalHarvested: number; totalRejected: number; totalAfterRejected: number; classifiedTotal: number }
    >();

    let grandHarvested = 0;
    let grandRejected = 0;
    let grandNet = 0;
    let grandClassified = 0;

    // Rejection-rate summary can exclude specific fields (Field.includeInRejectionSummary)
    // so an outlier field doesn't skew the general rejection percentage.
    let grandHarvestedForRejectionRate = 0;
    let grandRejectedForRejectionRate = 0;

    for (const r of records) {
      const dateKey = r.dateGregorian.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { totalHarvested: 0, totalRejected: 0, totalAfterRejected: 0, classifiedTotal: 0 });
      }
      const e = byDate.get(dateKey)!;
      e.totalHarvested += r.totalHarvested;
      e.totalRejected += r.totalRejected;
      e.totalAfterRejected += r.totalAfterRejected;
      e.classifiedTotal += r.classifiedTotal;
      grandHarvested += r.totalHarvested;
      grandRejected += r.totalRejected;
      grandNet += r.totalAfterRejected;
      grandClassified += r.classifiedTotal;

      if (r.field.includeInRejectionSummary) {
        grandHarvestedForRejectionRate += r.totalHarvested;
        grandRejectedForRejectionRate += r.totalRejected;
      }
    }

    const sortedDates = Array.from(byDate.keys()).sort();

    let cumulativeNet = 0;
    const netHarvest: DailyDataPoint[] = sortedDates.map((d, i) => {
      cumulativeNet += byDate.get(d)!.totalAfterRejected;
      return { label: `יום ${i + 1}`, value: cumulativeNet };
    });

    let cumulativeSorted = 0;
    const sorted: DailyDataPoint[] = sortedDates.map((d, i) => {
      cumulativeSorted += byDate.get(d)!.classifiedTotal;
      return { label: `יום ${i + 1}`, value: cumulativeSorted };
    });

    const [allTraders, traderStockRecords, privateSelectionRecords, moduloRecords] = await Promise.all([
      this.prisma.trader.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.traderStock.findMany({
        where: {
          seasonId,
          isDeleted: false,
          isModulo: false,
          isFromPrivateSelection: false,
          traderId: { not: null },
          type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] },
        },
        select: {
          traderId: true,
          quantity: true,
          grade: true,
          traderCategory: { select: { name: true } },
        },
      }),
      this.prisma.traderStock.findMany({
        where: {
          seasonId,
          isDeleted: false,
          isFromPrivateSelection: true,
          traderId: { not: null },
          type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] },
        },
        select: {
          traderId: true,
          quantity: true,
          grade: true,
          traderCategory: { select: { name: true } },
        },
      }),
      this.prisma.traderStock.findMany({
        where: {
          seasonId,
          isDeleted: false,
          isModulo: true,
          isFromPrivateSelection: false,
          traderId: null,
          type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] },
        },
        select: {
          quantity: true,
          grade: true,
          traderCategory: { select: { name: true } },
        },
      }),
    ]);

    const traderMap = new Map<number, { total: number; byCategory: Map<string, number>; privateSort: number }>(
      allTraders.map((t) => [t.id, { total: 0, byCategory: new Map(), privateSort: 0 }]),
    );

    type InventoryBucket = { total: number; matrix: Map<string, Map<string, number>>; privateTotal: number };
    const traderInventoryMap = new Map<number, InventoryBucket>(
      allTraders.map((t) => [t.id, { total: 0, matrix: new Map(), privateTotal: 0 }]),
    );

    const addToInventoryMatrix = (bucket: InventoryBucket, cat: string, grade: string, quantity: number) => {
      if (!bucket.matrix.has(cat)) bucket.matrix.set(cat, new Map());
      const row = bucket.matrix.get(cat)!;
      row.set(grade, (row.get(grade) ?? 0) + quantity);
      bucket.total += quantity;
    };

    for (const stock of traderStockRecords) {
      if (stock.traderId == null) continue;
      const entry = traderMap.get(stock.traderId);
      if (!entry) continue;
      entry.total += stock.quantity;
      const cat = stock.traderCategory.name;
      entry.byCategory.set(cat, (entry.byCategory.get(cat) ?? 0) + stock.quantity);

      const invBucket = traderInventoryMap.get(stock.traderId);
      if (invBucket) addToInventoryMatrix(invBucket, cat, stock.grade, stock.quantity);
    }

    for (const ps of privateSelectionRecords) {
      if (ps.traderId == null) continue;
      const entry = traderMap.get(ps.traderId);
      if (entry) entry.privateSort += ps.quantity;

      const invBucket = traderInventoryMap.get(ps.traderId);
      if (invBucket) {
        addToInventoryMatrix(invBucket, ps.traderCategory.name, ps.grade, ps.quantity);
        invBucket.privateTotal += ps.quantity;
      }
    }

    const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא'];

    const categoryGradeMatrix = new Map<string, Map<string, number>>();
    let generalInventoryTotal = 0;
    for (const stock of [...traderStockRecords, ...moduloRecords]) {
      const cat = stock.traderCategory.name;
      const grade = stock.grade;
      if (!categoryGradeMatrix.has(cat)) categoryGradeMatrix.set(cat, new Map());
      const row = categoryGradeMatrix.get(cat)!;
      row.set(grade, (row.get(grade) ?? 0) + stock.quantity);
      generalInventoryTotal += stock.quantity;
    }

    const gradesUsed = new Set<string>();
    for (const row of categoryGradeMatrix.values()) {
      for (const g of row.keys()) gradesUsed.add(g);
    }
    const generalSortingGrades = GRADE_ORDER.filter((g) => gradesUsed.has(g));
    const generalSortingCategories = Array.from(categoryGradeMatrix.keys());
    const generalSortingMatrix: Record<string, Record<string, number>> = {};
    for (const [cat, row] of categoryGradeMatrix.entries()) {
      generalSortingMatrix[cat] = Object.fromEntries(row);
    }

    const buildInventorySummary = (bucket: InventoryBucket) => {
      const bucketGradesUsed = new Set<string>();
      for (const row of bucket.matrix.values()) {
        for (const g of row.keys()) bucketGradesUsed.add(g);
      }
      const matrix: Record<string, Record<string, number>> = {};
      for (const [cat, row] of bucket.matrix.entries()) {
        matrix[cat] = Object.fromEntries(row);
      }
      return {
        total: bucket.total,
        categories: Array.from(bucket.matrix.keys()),
        grades: GRADE_ORDER.filter((g) => bucketGradesUsed.has(g)),
        matrix,
        privateTotal: bucket.privateTotal,
      };
    };

    const privateSortTotal = privateSelectionRecords.reduce((sum, r) => sum + r.quantity, 0);

    const MODULO_LABEL = 'לא משויך';

    const moduloByCat = new Map<string, number>();
    let moduloTotal = 0;
    for (const r of moduloRecords) {
      moduloTotal += r.quantity;
      const cat = r.traderCategory.name;
      moduloByCat.set(cat, (moduloByCat.get(cat) ?? 0) + r.quantity);
    }

    const traderDistributionGeneral: DailyDataPoint[] = [];
    const byTrader: Record<string, DailyDataPoint[]> = {};
    const traderNames: string[] = [];

    if (moduloTotal > 0) {
      traderDistributionGeneral.push({ label: MODULO_LABEL, value: moduloTotal });
      traderNames.push(MODULO_LABEL);
      byTrader[MODULO_LABEL] = Array.from(moduloByCat.entries())
        .filter(([, v]) => v > 0)
        .map(([cat, qty]) => ({ label: cat, value: qty }));
    }

    for (const trader of allTraders) {
      const entry = traderMap.get(trader.id)!;
      traderNames.push(trader.name);
      const totalIncludingPrivate = entry.total + entry.privateSort;
      if (totalIncludingPrivate > 0) {
        traderDistributionGeneral.push({ label: trader.name, value: totalIncludingPrivate });
      }
      const categoryBars = Array.from(entry.byCategory.entries())
        .filter(([, v]) => v > 0)
        .map(([cat, qty]) => ({ label: cat, value: qty }));
      if (entry.privateSort > 0) {
        categoryBars.push({ label: 'מיון פרטי', value: entry.privateSort });
      }
      byTrader[trader.name] = categoryBars;
    }

    const [allCustomers, customerAllocationRecords] = await Promise.all([
      this.prisma.customer.findMany({ select: { id: true, customerName: true }, orderBy: { customerName: 'asc' } }),
      this.prisma.customerAllocation.findMany({
        where: {
          seasonId,
          isDeleted: false,
          type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] },
        },
        select: {
          customerId: true,
          quantity: true,
          customerCategory: { select: { name: true, grade: true } },
        },
      }),
    ]);

    const customerMap = new Map<number, { total: number; byCategory: Map<string, number> }>(
      allCustomers.map((c) => [c.id, { total: 0, byCategory: new Map() }]),
    );

    for (const alloc of customerAllocationRecords) {
      const entry = customerMap.get(alloc.customerId);
      if (!entry) continue;
      entry.total += alloc.quantity;
      const cat = alloc.customerCategory
        ? `${alloc.customerCategory.name} ${alloc.customerCategory.grade}`
        : 'כללי';
      entry.byCategory.set(cat, (entry.byCategory.get(cat) ?? 0) + alloc.quantity);
    }

    const customerDistributionGeneral: DailyDataPoint[] = [];
    const byCustomer: Record<string, DailyDataPoint[]> = {};
    const customerNames: string[] = [];

    const customerSortTotal = customerAllocationRecords.reduce((sum, r) => sum + r.quantity, 0);

    for (const customer of allCustomers) {
      const entry = customerMap.get(customer.id)!;
      customerNames.push(customer.customerName);
      if (entry.total > 0) {
        customerDistributionGeneral.push({ label: customer.customerName, value: entry.total });
      }
      byCustomer[customer.customerName] = Array.from(entry.byCategory.entries())
        .filter(([, v]) => v > 0)
        .map(([cat, qty]) => ({ label: cat, value: qty }));
    }

    const shipmentRecords = await this.prisma.shipment.findMany({
      where: { seasonId, isDeleted: false },
      select: { totalQuantity: true, status: true },
    });

    let packaged = 0;
    let shipped = 0;
    let delivered = 0;

    for (const s of shipmentRecords) {
      packaged += s.totalQuantity;
      if (s.status === ShipmentStatus.SHIPPED || s.status === ShipmentStatus.DELIVERED) {
        shipped += s.totalQuantity;
      }
      if (s.status === ShipmentStatus.DELIVERED) {
        delivered += s.totalQuantity;
      }
    }

    const [shipmentItemRecords, traderSelfPickupAgg, customerSelfPickupAgg] = await Promise.all([
      this.prisma.shipmentItem.findMany({
        where: { seasonId, isDeleted: false, shipment: { isDeleted: false } },
        select: {
          quantity: true,
          grade: true,
          ownershipType: true,
          traderCategory: { select: { name: true } },
          shipment: { select: { status: true } },
        },
      }),
      this.prisma.traderStock.aggregate({
        where: { seasonId, isDeleted: false, type: MovementType.SELF_PICKUP },
        _sum: { quantity: true },
      }),
      this.prisma.customerAllocation.aggregate({
        where: { seasonId, isDeleted: false, type: MovementType.SELF_PICKUP },
        _sum: { quantity: true },
      }),
    ]);

    type ShipmentBucket = { matrix: Map<string, Map<string, number>>; customerTotal: number };
    const makeShipmentBucket = (): ShipmentBucket => ({ matrix: new Map(), customerTotal: 0 });
    const shipmentBuckets = {
      packaged: makeShipmentBucket(),
      shipped: makeShipmentBucket(),
      delivered: makeShipmentBucket(),
    };

    for (const item of shipmentItemRecords) {
      const inShipped = item.shipment.status === ShipmentStatus.SHIPPED || item.shipment.status === ShipmentStatus.DELIVERED;
      const inDelivered = item.shipment.status === ShipmentStatus.DELIVERED;
      const targets: ShipmentBucket[] = [shipmentBuckets.packaged];
      if (inShipped) targets.push(shipmentBuckets.shipped);
      if (inDelivered) targets.push(shipmentBuckets.delivered);

      for (const bucket of targets) {
        if (item.ownershipType === ItemOwnership.CUSTOMER) {
          bucket.customerTotal += item.quantity;
        } else if (item.ownershipType === ItemOwnership.GENERAL || item.ownershipType === ItemOwnership.TRADER) {
          if (!item.traderCategory || !item.grade) continue;
          const cat = item.traderCategory.name;
          if (!bucket.matrix.has(cat)) bucket.matrix.set(cat, new Map());
          const row = bucket.matrix.get(cat)!;
          row.set(item.grade, (row.get(item.grade) ?? 0) + item.quantity);
        }
      }
    }

    const buildShipmentStatusSummary = (total: number, bucket: ShipmentBucket) => {
      const gradesUsed = new Set<string>();
      for (const row of bucket.matrix.values()) {
        for (const g of row.keys()) gradesUsed.add(g);
      }
      const matrix: Record<string, Record<string, number>> = {};
      for (const [cat, row] of bucket.matrix.entries()) {
        matrix[cat] = Object.fromEntries(row);
      }
      return {
        total,
        categories: Array.from(bucket.matrix.keys()),
        grades: GRADE_ORDER.filter((g) => gradesUsed.has(g)),
        matrix,
        customerTotal: bucket.customerTotal,
      };
    };

    const selfPickupTotal =
      Math.abs(traderSelfPickupAgg._sum.quantity ?? 0) + Math.abs(customerSelfPickupAgg._sum.quantity ?? 0);

    const inventoryByTrader: Record<string, ReturnType<typeof buildInventorySummary>> = {};
    for (const trader of allTraders) {
      inventoryByTrader[trader.name] = buildInventorySummary(traderInventoryMap.get(trader.id)!);
    }

    const packagedSeries = await this.buildPackagedSeries(seasonId);

    const metrics: Record<string, MetricGauge> = {
      grossHarvest: { value: grandHarvested, percent: 100 },
      grossHarvestExcludingBadFields: { value: grandHarvestedForRejectionRate, percent: 100 },
      rejects: { value: grandRejected, percent: pct(grandRejected, grandHarvested) },
      rejectsExcludingBadFields: {
        value: grandRejectedForRejectionRate,
        percent: pct(grandRejectedForRejectionRate, grandHarvestedForRejectionRate),
      },
      netHarvest: { value: grandNet, percent: pct(grandNet, grandHarvested) },
      sorted: { value: grandClassified, percent: pct(grandClassified, grandNet) },
      packaged: { value: packaged, percent: pct(packaged, grandNet) },
      shipped: { value: shipped, percent: pct(shipped, grandNet) },
      delivered: { value: delivered, percent: pct(delivered, grandNet) },
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
      traderDistribution: {
        general: traderDistributionGeneral,
        byTrader,
        traderNames,
      },
      customerDistribution: {
        general: customerDistributionGeneral,
        byCustomer,
        customerNames,
      },
      sortingSummary: {
        netHarvest: grandNet,
        categories: generalSortingCategories,
        grades: generalSortingGrades,
        matrix: generalSortingMatrix,
        privateSortTotal,
        customerSortTotal,
      },
      shipmentsSummary: {
        packaged: buildShipmentStatusSummary(packaged, shipmentBuckets.packaged),
        shipped: buildShipmentStatusSummary(shipped, shipmentBuckets.shipped),
        delivered: buildShipmentStatusSummary(delivered, shipmentBuckets.delivered),
        selfPickupTotal,
      },
      inventorySummary: {
        general: {
          total: generalInventoryTotal,
          categories: generalSortingCategories,
          grades: generalSortingGrades,
          matrix: generalSortingMatrix,
          customerTotal: customerSortTotal,
        },
        byTrader: inventoryByTrader,
        traderNames: allTraders.map((t) => t.name),
      },
      metrics,
    };
  }
}
