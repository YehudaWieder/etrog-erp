import { MovementType, Prisma } from '@prisma/client';
import { CustomerInventorySummaryQuery } from 'src/inventory/services/customer-allocation/dto/customer-inventory-summary.dto';
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

  if (shipmentScope === 'ALL') {
    where.type = { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
  } else if (shipmentScope === 'UNSHIPPED') {
    // no type filter — include all movement types for true net calculation
  } else if (shipmentScope === 'SHIPPED') {
    where.type = MovementType.PACKED_SHIPPED;
  } else if (shipmentScope === 'PACKED_SHIPPED') {
    where.boxId = { not: null };
  } else {
    const exactMap: Partial<Record<InventoryMovementScope, MovementType>> = {
      SELF_PICKUP: MovementType.SELF_PICKUP,
      HARVEST_IN: MovementType.HARVEST_IN,
      INTERNAL_TRANSFER: MovementType.INTERNAL_TRANSFER,
      OWNERSHIP_TRANSFER: MovementType.OWNERSHIP_TRANSFER,
      ASSIGNED: MovementType.ASSIGNED,
      PRIVATE_SELECTION: MovementType.PRIVATE_SELECTION,
      WASTE: MovementType.WASTE,
      ADJUSTMENT: MovementType.ADJUSTMENT,
    };
    const type = exactMap[shipmentScope];
    if (type !== undefined) {
      where.type = type;
    }
  }

  return where;
}
