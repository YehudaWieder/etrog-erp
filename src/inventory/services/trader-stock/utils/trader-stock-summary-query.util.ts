import { Prisma } from 'src/generated/prisma';
import { InventorySummaryQuery } from 'src/inventory/services/trader-stock/dto/inventory-summary.dto';
import { buildMovementFilter } from 'src/inventory/services/validation/summary-query-rules';
import { InventoryMovementScope, InventoryOwnerScope } from 'src/inventory/types/inventory-query.types';

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

  const typeFilter = buildMovementFilter(shipmentScope);
  if (typeFilter !== undefined) {
    where.type = typeFilter;
  }

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
