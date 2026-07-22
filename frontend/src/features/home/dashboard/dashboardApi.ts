import { apiClient } from '../../../services/apiClient';
import type { DashboardData } from './types';

export async function getDashboardData(seasonId?: string): Promise<DashboardData> {
  if (!seasonId) return getEmptyDashboard();
  return apiClient<DashboardData>(`/dashboard?seasonId=${seasonId}`);
}

function getEmptyDashboard(): DashboardData {
  return {
    production: { netHarvest: [], netHarvestHistory: [], sorted: [], sortedHistory: [], packaged: [], packagedHistory: [] },
    traderDistribution: { general: [], byTrader: {}, traderNames: [] },
    customerDistribution: { general: [], byCustomer: {}, customerNames: [] },
    sortingSummary: { netHarvest: 0, categories: [], grades: [], matrix: {}, privateSortTotal: 0, customerSortTotal: 0 },
    shipmentsSummary: {
      packaged: { total: 0, categories: [], grades: [], matrix: {}, customerTotal: 0 },
      shipped: { total: 0, categories: [], grades: [], matrix: {}, customerTotal: 0 },
      delivered: { total: 0, categories: [], grades: [], matrix: {}, customerTotal: 0 },
      selfPickupTotal: 0,
    },
    inventorySummary: {
      general: { total: 0, categories: [], grades: [], matrix: {}, customerTotal: 0 },
      byTrader: {},
      traderNames: [],
    },
    metrics: {
      grossHarvest: { value: 0, percent: 0 },
      grossHarvestExcludingBadPicks: { value: 0, percent: 0 },
      rejects: { value: 0, percent: 0 },
      rejectsExcludingBadPicks: { value: 0, percent: 0 },
      netHarvest: { value: 0, percent: 0 },
      sorted: { value: 0, percent: 0 },
      packaged: { value: 0, percent: 0 },
      shipped: { value: 0, percent: 0 },
      delivered: { value: 0, percent: 0 },
      remainingInItaly: { value: 0, percent: 0 },
    },
  };
}
