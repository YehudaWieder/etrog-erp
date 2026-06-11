import { Grade, PitamStatus } from 'src/generated/prisma';

export type InventoryOwnerScope = 'ALL' | 'TRADER' | 'MODULO';
export type InventoryMovementScope =
  | 'ALL'
  | 'SHIPPED'
  | 'UNSHIPPED'
  | 'PACKED_SHIPPED'
  | 'SELF_PICKUP'
  | 'HARVEST_IN'
  | 'INTERNAL_TRANSFER'
  | 'OWNERSHIP_TRANSFER'
  | 'ASSIGNED'
  | 'PRIVATE_SELECTION'
  | 'WASTE'
  | 'ADJUSTMENT';
export type InventoryTraderSortBy =
  | 'category'
  | 'trader'
  | 'quantity'
  | 'grade'
  | 'pitamStatus'
  | 'updatedAt';

export type InventoryCustomerSortBy =
  | 'category'
  | 'customer'
  | 'quantity'
  | 'pitamStatus'
  | 'updatedAt';

export type InventorySortOrder = 'asc' | 'desc';
export interface InventorySummaryBaseFilters {
  seasonId?: number;
  traderId?: number;
  traderCategoryId?: number;
  customerId?: number;
  customerCategoryId?: number;
  grade?: Grade;
  pitamStatus?: PitamStatus;
}
