import { Prisma } from 'src/generated/prisma';
import { CustomerInventorySummaryQuery } from 'src/inventory/services/customer-allocation/dto/customer-inventory-summary.dto';
import { buildMovementFilter } from 'src/inventory/services/validation/summary-query-rules';
import { InventoryMovementScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

export function buildCustomerAllocationSummaryWhere(
  query: CustomerInventorySummaryQuery,
  seasonId: number,
  shipmentScope: InventoryMovementScope,
): Prisma.CustomerAllocationWhereInput {
  const where: Prisma.CustomerAllocationWhereInput = {
    seasonId,
    isDeleted: false,
    customerId: query.customerId,
    customerCategoryId: query.customerCategoryId,
    pitamStatus: query.pitamStatus,
  };

  const typeFilter = buildMovementFilter(shipmentScope);
  if (typeFilter !== undefined) {
    where.type = typeFilter;
  }

  return where;
}
