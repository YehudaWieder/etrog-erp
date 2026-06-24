import { Injectable } from '@nestjs/common';
import { MovementType, ShipmentStatus } from 'src/generated/prisma';
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
    const records = await this.prisma.shipment.findMany({
      where: { seasonId, isDeleted: false },
      select: { createdAt: true, totalQuantity: true },
      orderBy: { createdAt: 'asc' },
    });
    const byDate = new Map<string, number>();
    for (const r of records) {
      const key = r.createdAt.toISOString().split('T')[0];
      byDate.set(key, (byDate.get(key) ?? 0) + r.totalQuantity);
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
        select: { traderId: true, quantity: true },
      }),
      this.prisma.traderStock.findMany({
        where: {
          seasonId,
          isDeleted: false,
          isModulo: true,
          traderId: null,
          type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] },
        },
        select: {
          quantity: true,
          traderCategory: { select: { name: true } },
        },
      }),
    ]);

    const traderMap = new Map<number, { total: number; byCategory: Map<string, number>; privateSort: number }>(
      allTraders.map((t) => [t.id, { total: 0, byCategory: new Map(), privateSort: 0 }]),
    );

    for (const stock of traderStockRecords) {
      if (stock.traderId == null) continue;
      const entry = traderMap.get(stock.traderId);
      if (!entry) continue;
      entry.total += stock.quantity;
      const cat = stock.traderCategory.name;
      entry.byCategory.set(cat, (entry.byCategory.get(cat) ?? 0) + stock.quantity);
    }

    for (const ps of privateSelectionRecords) {
      if (ps.traderId == null) continue;
      const entry = traderMap.get(ps.traderId);
      if (entry) entry.privateSort += ps.quantity;
    }

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
      select: { createdAt: true, totalQuantity: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const byShipmentDate = new Map<string, { totalQuantity: number }>();
    let packaged = 0;
    let shipped = 0;

    for (const s of shipmentRecords) {
      const dateKey = s.createdAt.toISOString().split('T')[0];
      if (!byShipmentDate.has(dateKey)) byShipmentDate.set(dateKey, { totalQuantity: 0 });
      byShipmentDate.get(dateKey)!.totalQuantity += s.totalQuantity;
      packaged += s.totalQuantity;
      if (s.status === ShipmentStatus.SHIPPED || s.status === ShipmentStatus.DELIVERED) {
        shipped += s.totalQuantity;
      }
    }

    const sortedShipmentDates = Array.from(byShipmentDate.keys()).sort();
    let cumulativePackaged = 0;
    const packagedSeries: DailyDataPoint[] = sortedShipmentDates.map((d, i) => {
      cumulativePackaged += byShipmentDate.get(d)!.totalQuantity;
      return { label: `יום ${i + 1}`, value: cumulativePackaged };
    });

    const metrics: Record<string, MetricGauge> = {
      grossHarvest: { value: grandHarvested, percent: 100 },
      rejects: { value: grandRejected, percent: pct(grandRejected, grandHarvested) },
      netHarvest: { value: grandNet, percent: pct(grandNet, grandHarvested) },
      sorted: { value: grandClassified, percent: pct(grandClassified, grandNet) },
      packaged: { value: packaged, percent: pct(packaged, grandNet) },
      shipped: { value: shipped, percent: pct(shipped, grandNet) },
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
      metrics,
    };
  }
}
