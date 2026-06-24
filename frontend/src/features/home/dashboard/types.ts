export type DailyDataPoint = {
  label: string;
  value: number;
};

export type DistributionBar = {
  label: string;
  value: number;
};

export type HistorySeries = {
  yearName: number;
  data: DailyDataPoint[];
};

export type ProductionData = {
  netHarvest: DailyDataPoint[];
  netHarvestHistory: HistorySeries[];
  sorted: DailyDataPoint[];
  sortedHistory: HistorySeries[];
  packaged: DailyDataPoint[];
  packagedHistory: HistorySeries[];
};

export type TraderDistributionData = {
  general: DistributionBar[];
  byTrader: Record<string, DistributionBar[]>;
  traderNames: string[];
};

export type CustomerDistributionData = {
  general: DistributionBar[];
  byCustomer: Record<string, DistributionBar[]>;
  customerNames: string[];
};

export type MetricGauge = {
  value: number;
  percent: number;
};

export type DashboardMetrics = {
  grossHarvest: MetricGauge;
  rejects: MetricGauge;
  netHarvest: MetricGauge;
  sorted: MetricGauge;
  packaged: MetricGauge;
  shipped: MetricGauge;
};

export type DashboardData = {
  production: ProductionData;
  traderDistribution: TraderDistributionData;
  customerDistribution: CustomerDistributionData;
  metrics: DashboardMetrics;
};
