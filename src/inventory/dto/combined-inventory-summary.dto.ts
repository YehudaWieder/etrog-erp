import { InventoryMovementScope, InventoryOwnerScope, InventorySummaryBaseFilters } from 'src/inventory/types/inventory-query.types';

export type CombinedMovementScope = InventoryMovementScope;

export interface CombinedInventorySummaryQuery extends InventorySummaryBaseFilters {
  ownerScope?: InventoryOwnerScope;
  movementScope?: CombinedMovementScope;
}
