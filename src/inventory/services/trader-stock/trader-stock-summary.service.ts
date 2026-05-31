import { Injectable } from '@nestjs/common';
import { InventoryMovementScope } from 'src/inventory/types/inventory-query.types';
import {
  InventoryOwnerScope,
  InventoryShipmentScope,
  InventorySortBy,
  InventorySortOrder,
  InventorySummaryQuery,
  InventorySummaryResult,
  InventorySummaryRow,
  InventorySummaryTotals,
} from './dto/inventory-summary.dto';
import { SeasonsService } from 'src/seasons/seasons.service';
import { validateTraderSummaryQuery } from 'src/inventory/services/validation/summary-query-rules';
import { TraderStockSummaryRepository } from './trader-stock-summary.repository';
import { buildTraderStockSummaryWhere } from './utils/trader-stock-summary-query.util';

@Injectable()
export class TraderStockSummaryService {
  constructor(
    private readonly repository: TraderStockSummaryRepository,
    private readonly seasonsService: SeasonsService,
  ) {}

  async getSummary(query: InventorySummaryQuery): Promise<InventorySummaryResult> {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
    await this.seasonsService.assertSeasonExists(seasonId);

    const ownerScope = query.ownerScope ?? 'ALL';
    const shipmentScope = query.shipmentScope ?? 'ALL';
    const sortBy = query.sortBy ?? 'category';
    const sortOrder = query.sortOrder ?? 'asc';

    validateTraderSummaryQuery(query, ownerScope, shipmentScope, sortBy, sortOrder);

    const where = buildTraderStockSummaryWhere(
      query,
      seasonId,
      ownerScope,
      shipmentScope as InventoryMovementScope,
    );

    const rows = await this.repository.groupSummary(where);

    const filteredRows = rows.filter((row) => (row._sum.quantity ?? 0) !== 0);

    const traderIds = filteredRows
      .map((row) => row.traderId)
      .filter((traderId): traderId is number => traderId !== null);
    const categoryIds = [...new Set(filteredRows.map((row) => row.traderCategoryId))];

    const [traders, categories] = await Promise.all([
      this.repository.findTradersByIds(traderIds),
      this.repository.findCategoriesByIds(categoryIds),
    ]);

    const traderMap = new Map<number, string>();
    for (const trader of traders) {
      traderMap.set(trader.id, trader.name);
    }

    const categoryMap = new Map<number, string>();
    for (const category of categories) {
      categoryMap.set(category.id, category.name);
    }

    const summary: InventorySummaryRow[] = filteredRows.map((row) => ({
      traderId: row.traderId,
      traderName: row.isModulo
        ? 'MODULO'
        : row.traderId
          ? (traderMap.get(row.traderId) ?? null)
          : null,
      isModulo: row.isModulo,
      traderCategoryId: row.traderCategoryId,
      traderCategoryName: categoryMap.get(row.traderCategoryId) ?? null,
      grade: row.grade,
      pitamStatus: row.pitamStatus,
      quantity: row._sum.quantity ?? 0,
      lastUpdatedAt: row._max.updatedAt,
    }));

    const sorted = this.sortSummary(summary, sortBy, sortOrder);

    const totals: InventorySummaryTotals = sorted.reduce(
      (accumulator, row) => {
        accumulator.totalQuantity += row.quantity;
        if (row.isModulo) {
          accumulator.moduloQuantity += row.quantity;
        } else {
          accumulator.traderQuantity += row.quantity;
        }
        return accumulator;
      },
      { totalQuantity: 0, moduloQuantity: 0, traderQuantity: 0 },
    );

    return { rows: sorted, totals };
  }

  private sortSummary(
    summary: InventorySummaryRow[],
    sortBy: InventorySortBy,
    sortOrder: InventorySortOrder,
  ) {
    const factor = sortOrder === 'asc' ? 1 : -1;

    return summary.sort((left, right) => {
      switch (sortBy) {
        case 'trader':
          return this.compareValues(left.traderName ?? '', right.traderName ?? '', factor);
        case 'quantity':
          return this.compareValues(left.quantity, right.quantity, factor);
        case 'grade':
          return this.compareValues(left.grade, right.grade, factor);
        case 'pitamStatus':
          return this.compareValues(left.pitamStatus, right.pitamStatus, factor);
        case 'updatedAt':
          return this.compareValues(
            left.lastUpdatedAt?.getTime() ?? 0,
            right.lastUpdatedAt?.getTime() ?? 0,
            factor,
          );
        case 'category':
        default:
          return this.compareValues(
            left.traderCategoryName ?? '',
            right.traderCategoryName ?? '',
            factor,
          );
      }
    });
  }

  private compareValues(left: string | number, right: string | number, factor: number) {
    if (left < right) {
      return -1 * factor;
    }

    if (left > right) {
      return 1 * factor;
    }

    return 0;
  }
}
