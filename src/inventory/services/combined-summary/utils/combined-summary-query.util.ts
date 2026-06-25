import { Prisma } from '@prisma/client';
import { CombinedInventorySummaryQuery } from 'src/inventory/services/inventory-core/dto/combined-inventory-summary.dto';
import { buildMovementFilter } from 'src/inventory/services/validation/summary-query-rules';
import { InventoryMovementScope, InventoryOwnerScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

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

  if (query.excludePrivateSelection) {
    applyExcludePrivateSelection(traderWhere);
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

function applyExcludePrivateSelection(where: Prisma.TraderStockWhereInput) {
  const existing = where.type as Prisma.EnumMovementTypeFilter | string | undefined;

  if (!existing) {
    where.type = { not: 'PRIVATE_SELECTION' } as Prisma.EnumMovementTypeFilter;
    return;
  }

  if (typeof existing === 'object' && 'notIn' in existing && Array.isArray(existing.notIn)) {
    if (!(existing.notIn as string[]).includes('PRIVATE_SELECTION')) {
      (existing.notIn as string[]).push('PRIVATE_SELECTION');
    }
    return;
  }

  if (typeof existing === 'object' && 'not' in existing) {
    where.type = { notIn: [existing.not as string, 'PRIVATE_SELECTION'] } as Prisma.EnumMovementTypeFilter;
    return;
  }
  // exact-match string scope (e.g. 'HARVEST_IN') already excludes PRIVATE_SELECTION — nothing to do
}
