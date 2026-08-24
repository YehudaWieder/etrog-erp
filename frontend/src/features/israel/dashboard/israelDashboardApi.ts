import { apiClient } from '../../../services/apiClient';
import type { IsraelDashboardData, IsraelFieldSummaryBucket, IsraelFieldSummaryGroup } from './israelTypes';

export async function getIsraelDashboardData(seasonId?: string): Promise<IsraelDashboardData> {
  if (!seasonId) return getEmptyIsraelDashboard();
  return apiClient<IsraelDashboardData>(`/israel/dashboard?seasonId=${seasonId}`);
}

const emptyBucket = (): IsraelFieldSummaryBucket => ({ total: 0, categories: [], grades: [], matrix: {} });
const emptyGroup = (): IsraelFieldSummaryGroup => ({ general: emptyBucket(), byField: {}, fieldNames: [] });

function getEmptyIsraelDashboard(): IsraelDashboardData {
  return {
    production: { netHarvest: [], netHarvestHistory: [], sorted: [], sortedHistory: [], packaged: [], packagedHistory: [] },
    fieldDistribution: { general: [], byField: {}, fieldNames: [] },
    categoryDistribution: { general: [], byCategory: {}, categoryNames: [] },
    sortingSummary: { netHarvest: 0, ...emptyGroup() },
    shipmentsSummary: {
      packaged: emptyGroup(),
      shipped: emptyGroup(),
      delivered: emptyGroup(),
      selfPickupTotal: 0,
    },
    inventorySummary: {
      general: emptyBucket(),
      byField: {},
      fieldNames: [],
    },
    metrics: {
      harvest: { value: 0, percent: 0 },
      sorted: { value: 0, percent: 0 },
      packaged: { value: 0, percent: 0 },
      shipped: { value: 0, percent: 0 },
      delivered: { value: 0, percent: 0 },
      selfPickup: { value: 0, percent: 0 },
    },
  };
}
