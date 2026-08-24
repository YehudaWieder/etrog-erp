import { Grade, PitamStatus } from '@prisma/client';
import {
  InventoryMovementScope,
  InventoryOwnerScope,
  InventorySortOrder,
  InventorySummaryBaseFilters,
  InventoryTraderSortBy,
} from 'src/inventory/services/inventory-core/types/inventory-query.types';

export type InventoryShipmentScope = InventoryMovementScope;
export type InventorySourceScope = 'ALL' | 'GENERAL' | 'PRIVATE_SELECTION';
// ALL = no filter, DEFAULT_ONLY = rows split by the season's default shares (shareConditionId
// null AND isModulo false), UNASSIGNED_ONLY = pending modulo stock that hasn't been split under
// any scheme yet (isModulo true). A specific condition is selected via `shareConditionId` instead
// of a scope value.
export type InventoryShareConditionScope = 'ALL' | 'DEFAULT_ONLY' | 'UNASSIGNED_ONLY';
export type InventorySortBy = InventoryTraderSortBy;
export type {
  InventoryOwnerScope,
  InventorySortOrder,
} from 'src/inventory/services/inventory-core/types/inventory-query.types';

export interface InventorySummaryQuery extends InventorySummaryBaseFilters {
  ownerScope?: InventoryOwnerScope;
  shipmentScope?: InventoryShipmentScope;
  sourceScope?: InventorySourceScope;
  shareConditionScope?: InventoryShareConditionScope;
  // When set, filters to this exact TraderCategoryShareCondition, overriding shareConditionScope.
  shareConditionId?: number;
  sortBy?: InventorySortBy;
  sortOrder?: InventorySortOrder;
}

export interface InventorySummaryTotals {
  totalQuantity: number;
  moduloQuantity: number;
  traderQuantity: number;
  remainsInItalyQuantity: number;
  privateSelectionQuantity: number;
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
