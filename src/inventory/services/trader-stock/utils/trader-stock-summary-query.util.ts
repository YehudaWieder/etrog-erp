import { Prisma, MovementType } from '@prisma/client';
import { InventorySummaryQuery } from 'src/inventory/services/trader-stock/dto/inventory-summary.dto';
import { InventoryMovementScope, InventoryOwnerScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

export function buildTraderStockSummaryWhere(
  query: InventorySummaryQuery,
  seasonId: number,
  ownerScope: InventoryOwnerScope,
  shipmentScope: InventoryMovementScope,
): Prisma.TraderStockWhereInput {
  const where: Prisma.TraderStockWhereInput = {
    seasonId,
    isDeleted: false,
    traderCategoryId: query.traderCategoryId,
    grade: query.grade,
    pitamStatus: query.pitamStatus,
  };

  applyOwnerScope(where, ownerScope, query.traderId);

  // For non-box-based filters, apply type filter
  // For box-based filters (PACKED_SHIPPED, SHIPPED, UNSHIPPED), 
  // the repository will handle filtering by box.status
  applyNonBoxTypeFilters(where, shipmentScope);

  return where;
}

function applyOwnerScope(
  where: Prisma.TraderStockWhereInput,
  ownerScope: InventoryOwnerScope,
  traderId?: number,
) {
  if (ownerScope === 'TRADER') {
    where.isModulo = false;
    where.traderId = traderId;
    return;
  }

  if (ownerScope === 'MODULO') {
    where.isModulo = true;
    where.traderId = null;
    return;
  }

  if (traderId) {
    where.isModulo = false;
    where.traderId = traderId;
  }
}

function applyNonBoxTypeFilters(
  where: Prisma.TraderStockWhereInput,
  shipmentScope: InventoryMovementScope,
) {
  // PACKED_SHIPPED and UNSHIPPED are box-based scopes handled by groupSummaryWithBoxStatus
  // (no type filter applied here for those two).
  // SHIPPED and all exact-type scopes are handled here with a type filter.

  if (shipmentScope === 'ALL') {
    // Exclude delivery movements so they don't cancel the trader's gross inventory total.
    // Only INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, and WASTE negatives reduce this view.
    where.type = {
      notIn: ['SELF_PICKUP', 'PACKED_SHIPPED'],
    };
    return;
  }

  if (shipmentScope === 'SHIPPED') {
    // Show all PACKED_SHIPPED movement records (displayed as positive via Math.abs in the UI).
    where.type = MovementType.PACKED_SHIPPED;
    return;
  }

  if (shipmentScope === 'SELF_PICKUP') {
    where.type = MovementType.SELF_PICKUP;
    return;
  }

  if (shipmentScope === 'HARVEST_IN') {
    where.type = MovementType.HARVEST_IN;
    return;
  }

  if (shipmentScope === 'INTERNAL_TRANSFER') {
    where.type = MovementType.INTERNAL_TRANSFER;
    return;
  }

  if (shipmentScope === 'OWNERSHIP_TRANSFER') {
    where.type = MovementType.OWNERSHIP_TRANSFER;
    return;
  }

  if (shipmentScope === 'ASSIGNED') {
    where.type = MovementType.ASSIGNED;
    return;
  }

  if (shipmentScope === 'PRIVATE_SELECTION') {
    // Include the initial private-selection pool entries (type=PRIVATE_SELECTION)
    // plus any movement drawn from the pool (isFromPrivateSelection=true),
    // but exclude PACKED_SHIPPED and SELF_PICKUP — delivery movements are tracked separately.
    where.OR = [
      { type: MovementType.PRIVATE_SELECTION },
      { isFromPrivateSelection: true, type: { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] } },
    ];
    return;
  }

  if (shipmentScope === 'WASTE') {
    where.type = MovementType.WASTE;
    return;
  }

  if (shipmentScope === 'ADJUSTMENT') {
    where.type = MovementType.ADJUSTMENT;
    return;
  }
}
