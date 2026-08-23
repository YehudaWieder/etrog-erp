import { apiClient } from '../../../services/apiClient';
import type { TraderInventorySummaryFilters, TraderInventorySummaryResponse } from '../traderInventory.types';

export async function fetchTraderInventorySummary(
  filters: TraderInventorySummaryFilters,
): Promise<TraderInventorySummaryResponse> {
  const query = new URLSearchParams({
    shipmentScope: filters.shipmentScope || 'ALL',
    sourceScope: filters.sourceScope || 'ALL',
    shareConditionScope: filters.shareConditionScope || 'ALL',
    ownerScope: filters.ownerScope,
  });

  if (filters.seasonId) {
    query.set('seasonId', String(filters.seasonId));
  }

  if (filters.ownerScope === 'TRADER' && filters.traderId) {
    query.set('traderId', String(filters.traderId));
  }

  if (filters.shareConditionId) {
    query.set('shareConditionId', String(filters.shareConditionId));
  }

  return apiClient<TraderInventorySummaryResponse>(`/trader-stock/summary?${query.toString()}`, {
    suppressGlobalFeedback: true,
  });
}