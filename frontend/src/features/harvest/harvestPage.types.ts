export type SortingAssignmentFilter =
  | 'all'
  | 'general'
  | 'trader'
  | 'customer'
  | `trader:${string}`
  | `customer:${string}`;

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

export type HarvestExportTableData = {
  header: Array<string | number>;
  rows: Array<Array<string | number>>;
};
