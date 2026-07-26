import { MovementType, Prisma } from '@prisma/client';
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

  if (movementScope === 'PRIVATE_SELECTION') {
    // Remaining private-selection balance: the initial pool entries (type=PRIVATE_SELECTION)
    // netted against every deduction drawn from that pool (isFromPrivateSelection=true),
    // including deliveries (PACKED_SHIPPED, SELF_PICKUP) and waste — otherwise this would overstate
    // what's actually left, since InventoryAvailabilityService's stock check nets those in too.
    traderWhere.OR = [
      { type: MovementType.PRIVATE_SELECTION },
      { isFromPrivateSelection: true },
    ];
  } else {
    const typeFilter = buildMovementFilter(movementScope);
    if (typeFilter !== undefined) {
      traderWhere.type = typeFilter;
    }
  }

  if (query.excludePrivateSelection) {
    applyExcludePrivateSelection(traderWhere);
  }

  // REMAINS_IN_ITALY is a permanent regional-retention bucket (traderId: null, isModulo: false) -
  // never part of trader-owned or modulo-pool stock summaries. TRADER/MODULO ownerScope already
  // exclude it naturally via traderId/isModulo, but the default ALL scope with no traderId does not.
  excludeRemainsInItaly(traderWhere);

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

function excludeRemainsInItaly(where: Prisma.TraderStockWhereInput) {
  const existing = where.type as Prisma.EnumMovementTypeFilter | string | undefined;

  if (!existing) {
    where.type = { not: MovementType.REMAINS_IN_ITALY } as Prisma.EnumMovementTypeFilter;
    return;
  }

  if (typeof existing === 'object' && 'notIn' in existing && Array.isArray(existing.notIn)) {
    if (!(existing.notIn as string[]).includes(MovementType.REMAINS_IN_ITALY)) {
      (existing.notIn as string[]).push(MovementType.REMAINS_IN_ITALY);
    }
    return;
  }

  if (typeof existing === 'object' && 'not' in existing) {
    where.type = {
      notIn: [existing.not as string, MovementType.REMAINS_IN_ITALY],
    } as Prisma.EnumMovementTypeFilter;
    return;
  }
  // exact-match string scope (e.g. 'HARVEST_IN') already excludes REMAINS_IN_ITALY — nothing to do
}
