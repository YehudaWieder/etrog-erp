import type { CustomerMovement } from '../hooks/useCustomerMovements';

const SHIPMENT_MOVEMENT_TYPES = new Set(['PACKED_SHIPPED', 'SELF_PICKUP']);

export type CustomerMovementsSummaryTotals = {
  totalInventory: number;
  notPacked: number;
  packed: number;
};

export function buildCustomerMovementsSummaryTotals(movements: CustomerMovement[]): CustomerMovementsSummaryTotals {
  let totalInventory = 0;
  let packed = 0;

  for (const movement of movements) {
    if (SHIPMENT_MOVEMENT_TYPES.has(movement.type)) {
      packed += Math.abs(movement.quantity);
    } else {
      totalInventory += movement.quantity;
    }
  }

  return {
    totalInventory,
    notPacked: totalInventory - packed,
    packed,
  };
}
