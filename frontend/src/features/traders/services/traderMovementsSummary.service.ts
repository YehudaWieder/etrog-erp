import type { TraderMovement } from '../hooks/useTraderMovements';

const SHIPMENT_MOVEMENT_TYPES = new Set(['PACKED_SHIPPED', 'SELF_PICKUP']);

export type TraderMovementsSummaryTotals = {
  totalInventory: number;
  notPacked: number;
  packed: number;
};

export function buildTraderMovementsSummaryTotals(movements: TraderMovement[]): TraderMovementsSummaryTotals {
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
