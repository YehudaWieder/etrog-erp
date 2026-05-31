import { Grade, PitamStatus } from 'src/generated/prisma';
import {
  InventoryMovementScope,
  InventoryOwnerScope,
  InventorySortOrder,
  InventorySummaryBaseFilters,
  InventoryTraderSortBy,
} from 'src/inventory/types/inventory-query.types';

export type InventoryShipmentScope = InventoryMovementScope;
export type InventorySortBy = InventoryTraderSortBy;
export type {
  InventoryOwnerScope,
  InventorySortOrder,
} from 'src/inventory/types/inventory-query.types';

export interface InventorySummaryQuery extends InventorySummaryBaseFilters {
  ownerScope?: InventoryOwnerScope;
  shipmentScope?: InventoryShipmentScope;
  sortBy?: InventorySortBy;
  sortOrder?: InventorySortOrder;
}

export interface InventorySummaryTotals {
  totalQuantity: number;
  moduloQuantity: number;
  traderQuantity: number;
}

export interface InventorySummaryResult {
  rows: InventorySummaryRow[];
  totals: InventorySummaryTotals;
}

export interface InventorySummaryRow {
  traderId: number | null;
  traderName: string | null;
  isModulo: boolean;
  traderCategoryId: number;
  traderCategoryName: string | null;
  grade: Grade;
  pitamStatus: PitamStatus;
  quantity: number;
  lastUpdatedAt: Date | null;
}
