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
  grossHarvestExcludingBadPicks: MetricGauge;
  rejects: MetricGauge;
  rejectsExcludingBadPicks: MetricGauge;
  netHarvest: MetricGauge;
  sorted: MetricGauge;
  packaged: MetricGauge;
  shipped: MetricGauge;
  delivered: MetricGauge;
  remainingInItaly: MetricGauge;
  selfPickup: MetricGauge;
};

export type PitamGradeCell = {
  withPitam: number;
  withoutPitam: number;
  mixed: number;
};

export type SortingSummaryData = {
  netHarvest: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  privateSortTotal: number;
  customerSortTotal: number;
};

export type ShipmentStatusSummary = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  customerTotal: number;
};

export type ShipmentsSummaryData = {
  packaged: ShipmentStatusSummary;
  shipped: ShipmentStatusSummary;
  delivered: ShipmentStatusSummary;
  selfPickupTotal: number;
};

export type InventoryGeneralSummary = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  customerTotal: number;
  privateTotal: number;
  remainsInItalyTotal: number;
};

export type InventoryTraderSummary = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  privateTotal: number;
};

export type InventoryModuloSummary = {
  total: number;
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
};

export type InventorySummaryData = {
  general: InventoryGeneralSummary;
  byTrader: Record<string, InventoryTraderSummary>;
  traderNames: string[];
  modulo: InventoryModuloSummary;
};

export type DashboardData = {
  production: ProductionData;
  traderDistribution: TraderDistributionData;
  customerDistribution: CustomerDistributionData;
  sortingSummary: SortingSummaryData;
  shipmentsSummary: ShipmentsSummaryData;
  inventorySummary: InventorySummaryData;
  metrics: DashboardMetrics;
};
