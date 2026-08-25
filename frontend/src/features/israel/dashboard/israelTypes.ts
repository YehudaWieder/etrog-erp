import type { DailyDataPoint, DistributionBar, HistorySeries, PitamGradeCell } from '../../home/dashboard/types';

export type IsraelProductionData = {
  netHarvest: DailyDataPoint[];
  netHarvestHistory: HistorySeries[];
  sorted: DailyDataPoint[];
  sortedHistory: HistorySeries[];
  packaged: DailyDataPoint[];
  packagedHistory: HistorySeries[];
};

export type IsraelFieldDistributionData = {
  general: DistributionBar[];
  byField: Record<string, DistributionBar[]>;
  fieldNames: string[];
};

export type IsraelCategoryDistributionData = {
  general: DistributionBar[];
  byCategory: Record<string, DistributionBar[]>;
  categoryNames: string[];
};

export type IsraelMetricGauge = {
  value: number;
  percent: number;
};

export type IsraelDashboardMetrics = {
  harvest: IsraelMetricGauge;
  sorted: IsraelMetricGauge;
  packaged: IsraelMetricGauge;
  shipped: IsraelMetricGauge;
  delivered: IsraelMetricGauge;
  selfPickup: IsraelMetricGauge;
};

export type IsraelFieldSummaryBucket = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  fieldCategoryNames?: string[];
  byFieldCategory?: Record<string, IsraelFieldSummaryBucket>;
};

export type IsraelFieldSummaryGroup = {
  general: IsraelFieldSummaryBucket;
  byField: Record<string, IsraelFieldSummaryBucket>;
  fieldNames: string[];
};

export type IsraelSortingSummaryData = IsraelFieldSummaryGroup & {
  netHarvest: number;
};

export type IsraelShipmentsSummaryData = {
  packaged: IsraelFieldSummaryGroup;
  shipped: IsraelFieldSummaryGroup;
  delivered: IsraelFieldSummaryGroup;
  selfPickupTotal: number;
};

export type IsraelInventorySummaryData = {
  general: IsraelFieldSummaryBucket;
  byField: Record<string, IsraelFieldSummaryBucket>;
  fieldNames: string[];
};

export type IsraelDashboardData = {
  production: IsraelProductionData;
  fieldDistribution: IsraelFieldDistributionData;
  categoryDistribution: IsraelCategoryDistributionData;
  sortingSummary: IsraelSortingSummaryData;
  shipmentsSummary: IsraelShipmentsSummaryData;
  inventorySummary: IsraelInventorySummaryData;
  metrics: IsraelDashboardMetrics;
};
