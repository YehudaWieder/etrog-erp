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

  private async buildHarvestFieldSeries(seasonId: number, field: 'totalAfterRejected'): Promise<DailyDataPoint[]> {
    const records = await this.prisma.fieldHarvest.findMany({
      where: { seasonId, isDeleted: false },
      select: { dateGregorian: true, totalAfterRejected: true },
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

  private async buildSortedSeries(seasonId: number): Promise<DailyDataPoint[]> {
    // Classification has no dedicated "sorting date" — createdAt reflects the
    // day the sorting entry was actually recorded, unlike FieldHarvest.dateGregorian
    // which is the harvest day and can precede the sorting by several days.
    const records = await this.prisma.classification.findMany({
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
      Promise.all(prevSeasons.map(async (s) => ({ yearName: s.yearName, data: await this.buildSortedSeries(s.id) }))),
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
        isBadPick: true,
      },
      orderBy: { dateGregorian: 'asc' },
    });

    const byDate = new Map<string, { totalHarvested: number; totalRejected: number; totalAfterRejected: number }>();

    let grandHarvested = 0;
    let grandRejected = 0;
    let grandNet = 0;
    let grandClassified = 0;

    // Rejection-rate summary can exclude specific harvest records (FieldHarvest.isBadPick):
    // their harvested quantity still counts toward the denominator, only their rejected
    // quantity is dropped from the numerator, so an outlier pick doesn't skew the percentage.
    let grandHarvestedForRejectionRate = 0;
    let grandRejectedForRejectionRate = 0;

    for (const r of records) {
      const dateKey = r.dateGregorian.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { totalHarvested: 0, totalRejected: 0, totalAfterRejected: 0 });
      }
      const e = byDate.get(dateKey)!;
      e.totalHarvested += r.totalHarvested;
      e.totalRejected += r.totalRejected;
      e.totalAfterRejected += r.totalAfterRejected;
      grandHarvested += r.totalHarvested;
      grandRejected += r.totalRejected;
      grandNet += r.totalAfterRejected;
      grandClassified += r.classifiedTotal;

      grandHarvestedForRejectionRate += r.totalHarvested;
      if (!r.isBadPick) {
        grandRejectedForRejectionRate += r.totalRejected;
      }
    }

    const sortedDates = Array.from(byDate.keys()).sort();

    let cumulativeNet = 0;
    const netHarvest: DailyDataPoint[] = sortedDates.map((d, i) => {
      cumulativeNet += byDate.get(d)!.totalAfterRejected;
      return { label: `יום ${i + 1}`, value: cumulativeNet };
    });

    const sorted = await this.buildSortedSeries(seasonId);

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
          pitamStatus: true,
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
          pitamStatus: true,
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
          pitamStatus: true,
          traderCategory: { select: { name: true } },
        },
      }),
    ]);

    const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא'];

    type PitamGradeCell = { withPitam: number; withoutPitam: number; mixed: number };
    type PitamStatusLike = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

    const addToPitamMatrix = (
      matrix: Map<string, Map<string, PitamGradeCell>>,
      cat: string,
      grade: string,
      pitamStatus: PitamStatusLike,
      quantity: number,
    ) => {
      if (!matrix.has(cat)) matrix.set(cat, new Map());
      const row = matrix.get(cat)!;
      if (!row.has(grade)) row.set(grade, { withPitam: 0, withoutPitam: 0, mixed: 0 });
      const cell = row.get(grade)!;
      if (pitamStatus === 'WITH_PITAM') cell.withPitam += quantity;
      else if (pitamStatus === 'WITHOUT_PITAM') cell.withoutPitam += quantity;
      else cell.mixed += quantity;
    };

    const flattenPitamMatrix = (matrix: Map<string, Map<string, PitamGradeCell>>): Record<string, Record<string, PitamGradeCell>> => {
      const result: Record<string, Record<string, PitamGradeCell>> = {};
      for (const [cat, row] of matrix.entries()) {
        result[cat] = Object.fromEntries(row);
      }
      return result;
    };

    const gradesUsedIn = (matrix: Map<string, Map<string, PitamGradeCell>>): string[] => {
      const used = new Set<string>();
      for (const row of matrix.values()) {
        for (const g of row.keys()) used.add(g);
      }
      return GRADE_ORDER.filter((g) => used.has(g));
    };

    const traderMap = new Map<number, { total: number; byCategory: Map<string, number>; privateSort: number }>(
      allTraders.map((t) => [t.id, { total: 0, byCategory: new Map(), privateSort: 0 }]),
    );

    type InventoryBucket = { total: number; matrix: Map<string, Map<string, PitamGradeCell>>; privateTotal: number };
    const traderInventoryMap = new Map<number, InventoryBucket>(
      allTraders.map((t) => [t.id, { total: 0, matrix: new Map(), privateTotal: 0 }]),
    );

    for (const stock of traderStockRecords) {
      if (stock.traderId == null) continue;
      const entry = traderMap.get(stock.traderId);
      if (!entry) continue;
      entry.total += stock.quantity;
      const cat = stock.traderCategory.name;
      entry.byCategory.set(cat, (entry.byCategory.get(cat) ?? 0) + stock.quantity);

      const invBucket = traderInventoryMap.get(stock.traderId);
      if (invBucket) {
        addToPitamMatrix(invBucket.matrix, cat, stock.grade, stock.pitamStatus, stock.quantity);
        invBucket.total += stock.quantity;
      }
    }

    for (const ps of privateSelectionRecords) {
      if (ps.traderId == null) continue;
      const entry = traderMap.get(ps.traderId);
      if (entry) entry.privateSort += ps.quantity;

      const invBucket = traderInventoryMap.get(ps.traderId);
      if (invBucket) {
        addToPitamMatrix(invBucket.matrix, ps.traderCategory.name, ps.grade, ps.pitamStatus, ps.quantity);
        invBucket.total += ps.quantity;
        invBucket.privateTotal += ps.quantity;
      }
    }

    // Live inventory (general trader-owned + private-selection + modulo pool stock), not sorting -
    // feeds inventorySummary.general below. Mirrors the per-trader total, which also folds private
    // selection in and just breaks it out via privateTotal below. Excludes REMAINS_IN_ITALY
    // (traderId: null, isModulo: false rows never match traderStockRecords' traderId:{not:null}
    // filter nor moduloRecords' isModulo:true filter) and reflects post-transfer balances, unlike
    // sortingSummary (Classification-based, below).
    const generalInventoryMatrix = new Map<string, Map<string, PitamGradeCell>>();
    let generalInventoryTotal = 0;
    let generalPrivateTotal = 0;
    for (const stock of [...traderStockRecords, ...privateSelectionRecords, ...moduloRecords]) {
      addToPitamMatrix(generalInventoryMatrix, stock.traderCategory.name, stock.grade, stock.pitamStatus, stock.quantity);
      generalInventoryTotal += stock.quantity;
    }
    for (const ps of privateSelectionRecords) {
      generalPrivateTotal += ps.quantity;
    }

    const generalInventoryGrades = gradesUsedIn(generalInventoryMatrix);
    const generalInventoryCategories = Array.from(generalInventoryMatrix.keys());
    const generalInventoryMatrixFlat = flattenPitamMatrix(generalInventoryMatrix);

    const buildInventorySummary = (bucket: InventoryBucket) => ({
      total: bucket.total,
      categories: Array.from(bucket.matrix.keys()),
      grades: gradesUsedIn(bucket.matrix),
      matrix: flattenPitamMatrix(bucket.matrix),
      privateTotal: bucket.privateTotal,
    });

    const MODULO_LABEL = 'לא משויך';

    const moduloByCat = new Map<string, number>();
    let moduloTotal = 0;
    const moduloMatrix = new Map<string, Map<string, PitamGradeCell>>();
    for (const r of moduloRecords) {
      moduloTotal += r.quantity;
      const cat = r.traderCategory.name;
      moduloByCat.set(cat, (moduloByCat.get(cat) ?? 0) + r.quantity);
      addToPitamMatrix(moduloMatrix, cat, r.grade, r.pitamStatus, r.quantity);
    }
    const moduloGrades = gradesUsedIn(moduloMatrix);
    const moduloCategories = Array.from(moduloMatrix.keys());
    const moduloMatrixFlat = flattenPitamMatrix(moduloMatrix);

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

    // Live CustomerAllocation total (post-transfer), feeds inventorySummary.general.customerTotal
    // below - not to be confused with sortingSummary.customerSortTotal (Classification-based).
    const customerAllocationTotal = customerAllocationRecords.reduce((sum, r) => sum + r.quantity, 0);

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
          pitamStatus: true,
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

    const remainsInItalyAgg = await this.prisma.traderStock.aggregate({
      where: { seasonId, isDeleted: false, type: MovementType.REMAINS_IN_ITALY },
      _sum: { quantity: true },
    });
    const remainingInItaly = remainsInItalyAgg._sum.quantity ?? 0;

    // "קטיף ומיון" (sortingSummary) must reflect what was actually sorted, unaffected by later
    // inventory movements (transfers to customers, remains-in-Italy, etc.) - so it's built directly
    // from Classification, not from TraderStock/CustomerAllocation balances. Those balances (which do
    // reflect post-transfer state) are still the correct source for inventorySummary/traderDistribution
    // below - this query and its derived matrix are used only for sortingSummary.
    const classificationRecords = await this.prisma.classification.findMany({
      where: { seasonId, isDeleted: false },
      select: {
        quantity: true,
        grade: true,
        pitamStatus: true,
        assignmentType: true,
        traderCategory: { select: { name: true } },
      },
    });

    const classificationGeneralMatrix = new Map<string, Map<string, PitamGradeCell>>();
    let classificationPrivateTotal = 0;
    let classificationCustomerTotal = 0;

    for (const record of classificationRecords) {
      if (record.quantity <= 0) continue;
      const grade = record.grade ?? 'ללא';

      if (record.assignmentType === 'GENERAL') {
        const catName = record.traderCategory?.name?.trim() || '—';
        addToPitamMatrix(classificationGeneralMatrix, catName, grade, record.pitamStatus, record.quantity);
      } else if (record.assignmentType === 'TRADER') {
        classificationPrivateTotal += record.quantity;
      } else if (record.assignmentType === 'CUSTOMER') {
        classificationCustomerTotal += record.quantity;
      }
    }

    const classificationGrades = gradesUsedIn(classificationGeneralMatrix);
    const classificationCategories = Array.from(classificationGeneralMatrix.keys());
    const classificationMatrixFlat = flattenPitamMatrix(classificationGeneralMatrix);

    type ShipmentBucket = { matrix: Map<string, Map<string, PitamGradeCell>>; customerTotal: number };
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
          addToPitamMatrix(bucket.matrix, item.traderCategory.name, item.grade, item.pitamStatus, item.quantity);
        }
      }
    }

    const buildShipmentStatusSummary = (total: number, bucket: ShipmentBucket) => ({
      total,
      categories: Array.from(bucket.matrix.keys()),
      grades: gradesUsedIn(bucket.matrix),
      matrix: flattenPitamMatrix(bucket.matrix),
      customerTotal: bucket.customerTotal,
    });

    const selfPickupTotal =
      Math.abs(traderSelfPickupAgg._sum.quantity ?? 0) + Math.abs(customerSelfPickupAgg._sum.quantity ?? 0);

    const inventoryByTrader: Record<string, ReturnType<typeof buildInventorySummary>> = {};
    for (const trader of allTraders) {
      inventoryByTrader[trader.name] = buildInventorySummary(traderInventoryMap.get(trader.id)!);
    }

    const packagedSeries = await this.buildPackagedSeries(seasonId);

    // Packaged/shipped/delivered gauges track what's left the country via the normal
    // packaging/shipment pipeline: net harvest that stayed in Italy (REMAINS_IN_ITALY) never
    // enters it, and neither does self-pickup stock (it leaves inventory directly) - so both
    // must be excluded from the denominator, not just from netHarvest itself.
    const netBeforeSelfPickup = grandNet - remainingInItaly;
    const netAvailableForShipping = netBeforeSelfPickup - selfPickupTotal;

    const metrics: Record<string, MetricGauge> = {
      grossHarvest: { value: grandHarvested, percent: 100 },
      grossHarvestExcludingBadPicks: { value: grandHarvestedForRejectionRate, percent: 100 },
      rejects: { value: grandRejected, percent: pct(grandRejected, grandHarvested) },
      rejectsExcludingBadPicks: {
        value: grandRejectedForRejectionRate,
        percent: pct(grandRejectedForRejectionRate, grandHarvestedForRejectionRate),
      },
      netHarvest: { value: grandNet, percent: pct(grandNet, grandHarvested) },
      sorted: { value: grandClassified, percent: pct(grandClassified, grandNet) },
      packaged: { value: packaged, percent: pct(packaged, netAvailableForShipping) },
      shipped: { value: shipped, percent: pct(shipped, netAvailableForShipping) },
      delivered: { value: delivered, percent: pct(delivered, netAvailableForShipping) },
      remainingInItaly: { value: remainingInItaly, percent: pct(remainingInItaly, grandNet) },
      selfPickup: { value: selfPickupTotal, percent: pct(selfPickupTotal, netBeforeSelfPickup) },
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
        categories: classificationCategories,
        grades: classificationGrades,
        matrix: classificationMatrixFlat,
        privateSortTotal: classificationPrivateTotal,
        customerSortTotal: classificationCustomerTotal,
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
          categories: generalInventoryCategories,
          grades: generalInventoryGrades,
          matrix: generalInventoryMatrixFlat,
          customerTotal: customerAllocationTotal,
          privateTotal: generalPrivateTotal,
          remainsInItalyTotal: remainingInItaly,
        },
        byTrader: inventoryByTrader,
        traderNames: allTraders.map((t) => t.name),
        modulo: {
          total: moduloTotal,
          categories: moduloCategories,
          grades: moduloGrades,
          matrix: moduloMatrixFlat,
        },
      },
      metrics,
    };
  }
}
