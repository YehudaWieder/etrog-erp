import { Prisma } from 'src/generated/prisma';
import { CombinedInventorySummaryQuery } from 'src/inventory/dto/combined-inventory-summary.dto';
import { buildMovementFilter } from 'src/inventory/services/validation/summary-query-rules';
import { InventoryMovementScope, InventoryOwnerScope } from 'src/inventory/types/inventory-query.types';

export function buildCombinedTraderWhere(
  query: CombinedInventorySummaryQuery,
  seasonId: number,
  ownerScope: InventoryOwnerScope,
  movementScope: InventoryMovementScope,
): Prisma.TraderStockWhereInput {
  const traderWhere: Prisma.TraderStockWhereInput = { seasonId, isDeleted: false };

  if (query.traderCategoryId) traderWhere.traderCategoryId = query.traderCategoryId;
  if (query.grade) traderWhere.grade = query.grade;
  if (query.pitamStatus) traderWhere.pitamStatus = query.pitamStatus;

  applyOwnerScope(traderWhere, ownerScope, query.traderId);

  const typeFilter = buildMovementFilter(movementScope);
  if (typeFilter !== undefined) {
    traderWhere.type = typeFilter;
  }

  return traderWhere;
}

export function buildCombinedCustomerWhere(
  query: CombinedInventorySummaryQuery,
  seasonId: number,
  movementScope: InventoryMovementScope,
): Prisma.CustomerAllocationWhereInput {
  const customerWhere: Prisma.CustomerAllocationWhereInput = {
    seasonId,
    isDeleted: false,
  };

  if (query.customerId) customerWhere.customerId = query.customerId;
  if (query.customerCategoryId) customerWhere.customerCategoryId = query.customerCategoryId;
  if (query.pitamStatus) customerWhere.pitamStatus = query.pitamStatus;

  const typeFilter = buildMovementFilter(movementScope);
  if (typeFilter !== undefined) {
    customerWhere.type = typeFilter;
  }

  return customerWhere;
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
