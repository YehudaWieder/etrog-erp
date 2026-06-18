export type HarvestNumericColumnKey =
  | 'totalHarvested'
  | 'totalRejected'
  | 'totalAfterRejected'
  | 'classifiedTotal';

export type FieldReportNumericColumnKey =
  | 'totalHarvested'
  | 'totalRejected'
  | 'totalAfterRejected'
  | 'rejectionRate'
  | 'ownerHarvested'
  | 'ownerRejected'
  | 'ownerAfterRejected'
  | 'ownerRejectionRate';

export type SortingDailyNumericColumnKey =
  | 'totalSorted'
  | 'ownerSummary:trader'
  | 'ownerSummary:customer'
  | `category:${string}`;

export type SortingAssignmentFilter =
  | 'all'
  | 'trader'
  | 'customer'
  | `trader:${string}`
  | `customer:${string}`;

export type NumericSelectionScope = 'daily' | 'field-report' | 'sorting-daily';

export type NumericSelectableColumnKey =
  | HarvestNumericColumnKey
  | FieldReportNumericColumnKey
  | SortingDailyNumericColumnKey;

export type HarvestFormClassificationDraft = {
  id: string;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  traderId: string;
  customerId: string;
  traderCategoryId: string;
  customerCategoryId: string;
  grade: string;
  pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';
  quantity: string;
  notes: string;
};

export type HarvestFieldReportRow = {
  id: number;
  fieldName: string;
  recordCount: number;
  totalHarvested: number;
  totalRejected: number;
  totalAfterRejected: number;
  classifiedTotal: number;
  rejectionRate: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  ownerRejectionRate: number;
  differenceHarvested: number;
  differenceRejected: number;
  differenceAfterRejected: number;
  differenceRejectionRate: number;
  hasOwnerOverrides: boolean;
  isPartialClassification: boolean;
};

export type HarvestSelectionSummaryLabels = {
  selectedCells: (count: number) => string;
  total: (value: string) => string;
  clear: string;
};

export type HarvestExportTableData = {
  header: Array<string | number>;
  rows: Array<Array<string | number>>;
};
