import { apiClient } from '../../../services/apiClient';
import type {
  CustomerInventorySummaryFilters,
  CustomerInventorySummaryResponse,
} from '../customerInventory.types';

export async function fetchCustomerInventorySummary(
  filters: CustomerInventorySummaryFilters,
): Promise<CustomerInventorySummaryResponse> {
  const query = new URLSearchParams({
    shipmentScope: filters.shipmentScope || 'ALL',
  });

  if (filters.seasonId) {
    query.set('seasonId', String(filters.seasonId));
  }

  if (filters.customerId) {
    query.set('customerId', String(filters.customerId));
  }

  return apiClient<CustomerInventorySummaryResponse>(`/customer-allocations/summary?${query.toString()}`, {
    suppressGlobalFeedback: true,
  });
}
