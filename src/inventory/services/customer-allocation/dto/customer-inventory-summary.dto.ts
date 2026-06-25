import { PitamStatus } from '@prisma/client';
import {
  InventoryCustomerSortBy,
  InventoryMovementScope,
  InventorySortOrder,
  InventorySummaryBaseFilters,
} from 'src/inventory/services/inventory-core/types/inventory-query.types';

export type CustomerInventoryShipmentScope = InventoryMovementScope;
export type CustomerInventorySortBy = InventoryCustomerSortBy;
export type CustomerInventorySortOrder = InventorySortOrder;

export interface CustomerInventorySummaryQuery extends InventorySummaryBaseFilters {
  shipmentScope?: CustomerInventoryShipmentScope;
  sortBy?: CustomerInventorySortBy;
  sortOrder?: CustomerInventorySortOrder;
}

export interface CustomerInventorySummaryTotals {
  totalQuantity: number;
}

export interface CustomerInventorySummaryRow {
  customerId: number;
  customerName: string | null;
  customerCategoryId: number;
  customerCategoryName: string | null;
  categoryGrade: string | null;
  pitamStatus: PitamStatus;
  quantity: number;
  lastUpdatedAt: Date | null;
}

export interface CustomerInventorySummaryResult {
  rows: CustomerInventorySummaryRow[];
  totals: CustomerInventorySummaryTotals;
}
