import { BadRequestException } from '@nestjs/common';
import { MovementType } from 'src/generated/prisma';
import { CombinedInventorySummaryQuery } from 'src/inventory/dto/combined-inventory-summary.dto';
import { CustomerInventoryShipmentScope, CustomerInventorySortBy, CustomerInventorySortOrder } from 'src/inventory/services/customer-allocation/dto/customer-inventory-summary.dto';
import { InventorySummaryQuery } from 'src/inventory/services/trader-stock/dto/inventory-summary.dto';
import { InventoryMovementScope, InventoryOwnerScope, InventorySortOrder, InventoryTraderSortBy } from 'src/inventory/types/inventory-query.types';

export function validateTraderSummaryQuery(
  query: InventorySummaryQuery,
  ownerScope: InventoryOwnerScope,
  shipmentScope: InventoryMovementScope,
  sortBy: InventoryTraderSortBy,
  sortOrder: InventorySortOrder,
) {
  if (!['ALL', 'TRADER', 'MODULO'].includes(ownerScope)) {
    throw new BadRequestException('ownerScope must be ALL, TRADER, or MODULO');
  }

  const validShipmentScopes: InventoryMovementScope[] = [
    'ALL',
    'SHIPPED',
    'UNSHIPPED',
    'PACKED_SHIPPED',
    'SELF_PICKUP',
    'HARVEST_IN',
    'INTERNAL_TRANSFER',
    'OWNERSHIP_TRANSFER',
    'ASSIGNED',
    'WASTE',
    'ADJUSTMENT',
  ];
  if (!validShipmentScopes.includes(shipmentScope)) {
    throw new BadRequestException(
      'shipmentScope must be one of: ALL, SHIPPED, UNSHIPPED, PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT',
    );
  }

  if (!['category', 'trader', 'quantity', 'grade', 'pitamStatus', 'updatedAt'].includes(sortBy)) {
    throw new BadRequestException('sortBy must be category, trader, quantity, grade, pitamStatus, or updatedAt');
  }

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new BadRequestException('sortOrder must be asc or desc');
  }

  if (ownerScope === 'TRADER' && !query.traderId) {
    throw new BadRequestException('traderId is required when ownerScope=TRADER');
  }

  if (ownerScope === 'MODULO' && query.traderId) {
    throw new BadRequestException('traderId must be empty when ownerScope=MODULO');
  }
}

export function validateCustomerSummaryQuery(
  shipmentScope: CustomerInventoryShipmentScope,
  sortBy: CustomerInventorySortBy,
  sortOrder: CustomerInventorySortOrder,
) {
  const validShipmentScopes: CustomerInventoryShipmentScope[] = [
    'ALL',
    'SHIPPED',
    'UNSHIPPED',
    'PACKED_SHIPPED',
    'SELF_PICKUP',
    'HARVEST_IN',
    'INTERNAL_TRANSFER',
    'OWNERSHIP_TRANSFER',
    'ASSIGNED',
    'WASTE',
    'ADJUSTMENT',
  ];
  if (!validShipmentScopes.includes(shipmentScope)) {
    throw new BadRequestException(
      'shipmentScope must be one of: ALL, SHIPPED, UNSHIPPED, PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT',
    );
  }

  if (!['category', 'customer', 'quantity', 'pitamStatus', 'updatedAt'].includes(sortBy)) {
    throw new BadRequestException('sortBy must be category, customer, quantity, pitamStatus, or updatedAt');
  }

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new BadRequestException('sortOrder must be asc or desc');
  }
}

export function validateCombinedSummaryQuery(
  query: CombinedInventorySummaryQuery,
  ownerScope: 'ALL' | 'TRADER' | 'MODULO',
  movementScope: InventoryMovementScope,
) {
  if (!['ALL', 'TRADER', 'MODULO'].includes(ownerScope)) {
    throw new BadRequestException('ownerScope must be ALL, TRADER, or MODULO');
  }

  const validScopes: InventoryMovementScope[] = [
    'ALL',
    'SHIPPED',
    'UNSHIPPED',
    'PACKED_SHIPPED',
    'SELF_PICKUP',
    'HARVEST_IN',
    'INTERNAL_TRANSFER',
    'OWNERSHIP_TRANSFER',
    'ASSIGNED',
    'WASTE',
    'ADJUSTMENT',
  ];
  if (!validScopes.includes(movementScope)) {
    throw new BadRequestException('movementScope must be one of: ' + validScopes.join(', '));
  }

  if (ownerScope === 'TRADER' && !query.traderId) {
    throw new BadRequestException('traderId is required when ownerScope=TRADER');
  }
}

export function buildMovementFilter(scope: InventoryMovementScope) {
  if (scope === 'ALL') return undefined;
  if (scope === 'SHIPPED') {
    return { in: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
  }
  if (scope === 'UNSHIPPED') {
    return { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
  }

  const exactMap: Partial<Record<InventoryMovementScope, MovementType>> = {
    PACKED_SHIPPED: MovementType.PACKED_SHIPPED,
    SELF_PICKUP: MovementType.SELF_PICKUP,
    HARVEST_IN: MovementType.HARVEST_IN,
    INTERNAL_TRANSFER: MovementType.INTERNAL_TRANSFER,
    OWNERSHIP_TRANSFER: MovementType.OWNERSHIP_TRANSFER,
    ASSIGNED: MovementType.ASSIGNED,
    WASTE: MovementType.WASTE,
    ADJUSTMENT: MovementType.ADJUSTMENT,
  };

  return exactMap[scope];
}
