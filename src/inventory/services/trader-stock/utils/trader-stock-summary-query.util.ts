import { Prisma } from 'src/generated/prisma';
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
  // Only apply type filter for non-box-based scopes
  // Box-based scopes (PACKED_SHIPPED, SHIPPED, UNSHIPPED) are handled by the repository
  
  // For ALL scope: exclude SELF_PICKUP, PACKED_SHIPPED (handled by repository filtering for boxId)
  if (shipmentScope === 'ALL') {
    where.type = {
      notIn: ['SELF_PICKUP', 'PACKED_SHIPPED'],
    };
    return;
  }

  if (shipmentScope === 'SELF_PICKUP') {
    where.type = 'SELF_PICKUP';
    return;
  }

  if (shipmentScope === 'HARVEST_IN') {
    where.type = 'HARVEST_IN';
    return;
  }

  if (shipmentScope === 'INTERNAL_TRANSFER') {
    where.type = 'INTERNAL_TRANSFER';
    return;
  }

  if (shipmentScope === 'OWNERSHIP_TRANSFER') {
    where.type = 'OWNERSHIP_TRANSFER';
    return;
  }

  if (shipmentScope === 'ASSIGNED') {
    where.type = 'ASSIGNED';
    return;
  }

  if (shipmentScope === 'WASTE') {
    where.type = 'WASTE';
    return;
  }

  if (shipmentScope === 'ADJUSTMENT') {
    where.type = 'ADJUSTMENT';
    return;
  }
}
