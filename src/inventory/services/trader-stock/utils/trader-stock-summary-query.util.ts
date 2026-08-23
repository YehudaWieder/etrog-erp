import { Prisma, MovementType } from '@prisma/client';
import { InventoryShareConditionScope, InventorySourceScope, InventorySummaryQuery } from 'src/inventory/services/trader-stock/dto/inventory-summary.dto';
import { InventoryMovementScope, InventoryOwnerScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

export function buildTraderStockSummaryWhere(
  query: InventorySummaryQuery,
  seasonId: number,
  ownerScope: InventoryOwnerScope,
  shipmentScope: InventoryMovementScope,
  sourceScope: InventorySourceScope = 'ALL',
  remainsInItalyCustomerAnchorIds?: number[],
  transferredToCustomerModuloRefundIds?: number[],
): Prisma.TraderStockWhereInput {
  if (shipmentScope === 'REMAINS_IN_ITALY') {
    // Regional-retention bucket is never trader/modulo owned - ownerScope/traderId from the
    // client are irrelevant here and intentionally ignored.
    return {
      seasonId,
      isDeleted: false,
      traderCategoryId: query.traderCategoryId,
      grade: query.grade,
      pitamStatus: query.pitamStatus,
      traderId: null,
      isModulo: false,
      type: MovementType.REMAINS_IN_ITALY,
    };
  }

  const where: Prisma.TraderStockWhereInput = {
    seasonId,
    isDeleted: false,
    traderCategoryId: query.traderCategoryId,
    grade: query.grade,
    pitamStatus: query.pitamStatus,
  };

  applyOwnerScope(where, ownerScope, query.traderId);

  // REMAINS_IN_ITALY is a permanent regional-retention bucket - never part of packing-availability
  // or general stock summaries. UNSHIPPED/PACKED_SHIPPED are box-status scopes handled entirely by
  // the repository (no where.type set below for them), so exclude it here explicitly for UNSHIPPED;
  // PACKED_SHIPPED naturally excludes it since REMAINS_IN_ITALY rows never get a boxId.
  if (shipmentScope === 'UNSHIPPED') {
    where.type = { not: MovementType.REMAINS_IN_ITALY };
  }

  applySourceScope(where, sourceScope);
  applyShareConditionScope(where, query.shareConditionScope ?? 'ALL', query.shareConditionId);

  // For non-box-based filters, apply type filter
  // For box-based filters (PACKED_SHIPPED, SHIPPED, UNSHIPPED),
  // the repository will handle filtering by box.status
  applyNonBoxTypeFilters(where, shipmentScope, remainsInItalyCustomerAnchorIds, transferredToCustomerModuloRefundIds);

  return where;
}

// Composes an extra condition onto `where` without clobbering one already set by another step
// (e.g. applySourceScope's OR and a status filter's OR would otherwise overwrite each other since
// both would assign the same `where.OR` key).
function pushAndCondition(where: Prisma.TraderStockWhereInput, condition: Prisma.TraderStockWhereInput) {
  const existing = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  where.AND = [...existing, condition];
}

function applySourceScope(where: Prisma.TraderStockWhereInput, sourceScope: InventorySourceScope) {
  if (sourceScope === 'PRIVATE_SELECTION') {
    pushAndCondition(where, {
      OR: [
        { type: MovementType.PRIVATE_SELECTION },
        { isFromPrivateSelection: true },
      ],
    });
    return;
  }

  if (sourceScope === 'GENERAL') {
    pushAndCondition(where, {
      NOT: {
        OR: [
          { type: MovementType.PRIVATE_SELECTION },
          { isFromPrivateSelection: true },
        ],
      },
    });
  }

  // ALL: no source restriction.
}

function applyShareConditionScope(
  where: Prisma.TraderStockWhereInput,
  shareConditionScope: InventoryShareConditionScope,
  shareConditionId?: number,
) {
  if (shareConditionId != null) {
    where.shareConditionId = shareConditionId;
    return;
  }

  if (shareConditionScope === 'DEFAULT_ONLY') {
    where.shareConditionId = null;
  }

  // ALL: no restriction.
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
  remainsInItalyCustomerAnchorIds?: number[],
  transferredToCustomerModuloRefundIds?: number[],
) {
  // PACKED_SHIPPED and UNSHIPPED are box-based scopes handled by groupSummaryWithBoxStatus
  // (no type filter applied here for those two).
  // SHIPPED and all exact-type scopes are handled here with a type filter.

  if (shipmentScope === 'ALL') {
    // Exclude delivery movements so they don't cancel the trader's gross inventory total.
    // Only INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, and WASTE negatives reduce this view.
    // REMAINS_IN_ITALY is also excluded - it's never part of tradeable/packable stock.
    where.type = {
      notIn: [MovementType.SELF_PICKUP, MovementType.PACKED_SHIPPED, MovementType.REMAINS_IN_ITALY],
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

  if (shipmentScope === 'TRANSFERRED_TO_CUSTOMER') {
    // INTERNAL_TRANSFER on traderStock is exclusively TRADER<->CUSTOMER (never trader<->trader,
    // that's OWNERSHIP_TRANSFER). The negative side is stock the trader gave to a customer; the
    // positive side is stock received back from one. Only the negative side counts here.
    // Also includes REMAINS_IN_ITALY withdrawals whose destination was a customer (see
    // RemainsInItalyWithdrawalService) - those anchor rows are looked up by the caller and passed
    // in as remainsInItalyCustomerAnchorIds, since that link isn't derivable from this row alone.
    // Also includes the modulo-remainder refund rows from CustomerGeneralTransferService's
    // rounding-up-to-whole-shares mechanism (transferredToCustomerModuloRefundIds) - these are
    // positive and share traderId/isModulo/category/grade/pitam with the corresponding moduloUsed
    // deduction from the same operation, so groupBy nets them together automatically, keeping the
    // per-category breakdown and the grand total consistent with what customers actually received.
    const clauses: Prisma.TraderStockWhereInput[] = [
      { type: MovementType.INTERNAL_TRANSFER, quantity: { lt: 0 } },
    ];
    if (remainsInItalyCustomerAnchorIds && remainsInItalyCustomerAnchorIds.length > 0) {
      clauses.push({ type: MovementType.REMAINS_IN_ITALY, id: { in: remainsInItalyCustomerAnchorIds } });
    }
    if (transferredToCustomerModuloRefundIds && transferredToCustomerModuloRefundIds.length > 0) {
      clauses.push({ type: MovementType.ASSIGNED, id: { in: transferredToCustomerModuloRefundIds } });
    }
    where.OR = clauses;
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
    // Remaining private-selection balance: the initial pool entries (type=PRIVATE_SELECTION)
    // netted against every deduction drawn from that pool (isFromPrivateSelection=true),
    // including deliveries (PACKED_SHIPPED, SELF_PICKUP) — otherwise this would overstate what's
    // actually left, since InventoryAvailabilityService's stock check nets those in too.
    where.OR = [
      { type: MovementType.PRIVATE_SELECTION },
      { isFromPrivateSelection: true },
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
