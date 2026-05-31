import {
  CustomerInventoryShipmentScope,
  CustomerInventorySortBy,
  CustomerInventorySummaryQuery,
} from 'src/inventory/services/customer-allocation/dto/customer-inventory-summary.dto';
import { PitamStatus } from 'src/generated/prisma';
import { parseOptionalInt } from 'src/inventory/services/inventory-core/utils/inventory-query-parse.util';

export function buildCustomerAllocationSummaryQuery(input: {
  seasonId?: string;
  customerId?: string;
  shipmentScope?: CustomerInventoryShipmentScope;
  customerCategoryId?: string;
  pitamStatus?: PitamStatus;
  sortBy?: CustomerInventorySortBy;
  sortOrder?: 'asc' | 'desc';
}): CustomerInventorySummaryQuery {
  return {
    seasonId: parseOptionalInt(input.seasonId),
    customerId: parseOptionalInt(input.customerId),
    shipmentScope: input.shipmentScope,
    customerCategoryId: parseOptionalInt(input.customerCategoryId),
    pitamStatus: input.pitamStatus,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  };
}
