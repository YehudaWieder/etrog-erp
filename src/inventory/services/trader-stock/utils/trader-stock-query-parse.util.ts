import {
  InventoryOwnerScope,
  InventoryShipmentScope,
  InventorySortBy,
  InventorySourceScope,
  InventorySummaryQuery,
} from 'src/inventory/services/trader-stock/dto/inventory-summary.dto';
import { Grade, PitamStatus } from '@prisma/client';
import { parseOptionalInt } from 'src/inventory/services/inventory-core/utils/inventory-query-parse.util';

export function buildTraderStockSummaryQuery(input: {
  seasonId?: string;
  traderId?: string;
  ownerScope?: InventoryOwnerScope;
  shipmentScope?: InventoryShipmentScope;
  sourceScope?: InventorySourceScope;
  traderCategoryId?: string;
  grade?: Grade;
  pitamStatus?: PitamStatus;
  sortBy?: InventorySortBy;
  sortOrder?: 'asc' | 'desc';
}): InventorySummaryQuery {
  return {
    seasonId: parseOptionalInt(input.seasonId),
    traderId: parseOptionalInt(input.traderId),
    ownerScope: input.ownerScope,
    shipmentScope: input.shipmentScope,
    sourceScope: input.sourceScope,
    traderCategoryId: parseOptionalInt(input.traderCategoryId),
    grade: input.grade,
    pitamStatus: input.pitamStatus,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  };
}
