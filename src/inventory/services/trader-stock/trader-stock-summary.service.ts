import { Injectable } from '@nestjs/common';
import { Grade, PitamStatus } from '@prisma/client';
import { InventoryMovementScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';
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
import { TraderStockSummaryRepository } from 'src/inventory/services/trader-stock/trader-stock-summary.repository';
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
    const sourceScope = query.sourceScope ?? 'ALL';
    const sortBy = query.sortBy ?? 'category';
    const sortOrder = query.sortOrder ?? 'asc';

    validateTraderSummaryQuery(query, ownerScope, shipmentScope, sourceScope, sortBy, sortOrder);

    const [remainsInItalyCustomerAnchorIds, transferredToCustomerModuloRefundIds] =
      shipmentScope === 'TRANSFERRED_TO_CUSTOMER'
        ? await Promise.all([
            this.repository.findRemainsInItalyCustomerAnchorIds(seasonId, {
              traderCategoryId: query.traderCategoryId,
              grade: query.grade,
              pitamStatus: query.pitamStatus,
            }),
            this.repository.findTransferredToCustomerModuloRefundIds(seasonId, {
              traderCategoryId: query.traderCategoryId,
              grade: query.grade,
              pitamStatus: query.pitamStatus,
            }),
          ])
        : [undefined, undefined];

    const where = buildTraderStockSummaryWhere(
      query,
      seasonId,
      ownerScope,
      shipmentScope as InventoryMovementScope,
      sourceScope,
      remainsInItalyCustomerAnchorIds,
      transferredToCustomerModuloRefundIds,
    );

    // The "remains in Italy" total is always shown regardless of the active shipment-scope
    // filter, so it's fetched independently rather than derived from the filtered rows below.
    const remainsInItalyWhere = buildTraderStockSummaryWhere(query, seasonId, ownerScope, 'REMAINS_IN_ITALY');
    // The trader/modulo/private-selection split cards each represent one slice of general stock
    // under the *currently selected* shipment-scope filter (e.g. only shipped rows when the user
    // filters by "shipped"), so each is fetched independently with that same shipmentScope but a
    // forced sourceScope, rather than mixing sources together like the filtered rows below.
    const generalWhere = buildTraderStockSummaryWhere(
      query,
      seasonId,
      ownerScope,
      shipmentScope as InventoryMovementScope,
      'GENERAL',
      remainsInItalyCustomerAnchorIds,
      transferredToCustomerModuloRefundIds,
    );
    const privateSelectionWhere = buildTraderStockSummaryWhere(
      query,
      seasonId,
      ownerScope,
      shipmentScope as InventoryMovementScope,
      'PRIVATE_SELECTION',
      remainsInItalyCustomerAnchorIds,
      transferredToCustomerModuloRefundIds,
    );

    const [rows, remainsInItalyQuantity, generalRows, privateSelectionRows] = await Promise.all([
      this.repository.groupSummary(where, shipmentScope as InventoryMovementScope),
      this.repository.sumQuantity(remainsInItalyWhere),
      this.repository.groupSummary(generalWhere, shipmentScope as InventoryMovementScope),
      // REMAINS_IN_ITALY is a standalone regional bucket unrelated to the private-selection pool -
      // buildTraderStockSummaryWhere ignores sourceScope entirely for that shipmentScope (it would
      // otherwise return the same where as remainsInItalyWhere above), so skip the query then.
      shipmentScope === 'REMAINS_IN_ITALY'
        ? Promise.resolve([])
        : this.repository.groupSummary(privateSelectionWhere, shipmentScope as InventoryMovementScope),
    ]);

    const privateSelectionQuantity = privateSelectionRows.reduce(
      (sum, row) => sum + (row._sum.quantity ?? 0),
      0,
    );

    const { traderQuantity, moduloQuantity } =
      shipmentScope === 'REMAINS_IN_ITALY'
        ? { traderQuantity: 0, moduloQuantity: 0 }
        : generalRows.reduce(
            (accumulator, row) => {
              const quantity = row._sum.quantity ?? 0;
              if (row.isModulo) {
                accumulator.moduloQuantity += quantity;
              } else {
                accumulator.traderQuantity += quantity;
              }
              return accumulator;
            },
            { traderQuantity: 0, moduloQuantity: 0 },
          );

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
          : shipmentScope === 'REMAINS_IN_ITALY'
            ? 'REMAINS_IN_ITALY'
            : null,
      isModulo: row.isModulo,
      traderCategoryId: row.traderCategoryId,
      traderCategoryName: categoryMap.get(row.traderCategoryId) ?? null,
      grade: row.grade as Grade,
      pitamStatus: row.pitamStatus as PitamStatus,
      quantity: row._sum.quantity ?? 0,
      lastUpdatedAt: row._max.updatedAt,
    }));

    const sorted = this.sortSummary(summary, sortBy, sortOrder);

    const totals: InventorySummaryTotals = sorted.reduce(
      (accumulator, row) => {
        accumulator.totalQuantity += row.quantity;
        return accumulator;
      },
      { totalQuantity: 0, moduloQuantity, traderQuantity, remainsInItalyQuantity, privateSelectionQuantity },
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
