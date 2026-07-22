export type SortingAssignmentFilter =
  | 'all'
  | 'general'
  | 'trader'
  | 'customer'
  | `trader:${string}`
  | `customer:${string}`;

import type { GradeQuantityMatrix } from './utils/harvestClassificationMatrix.util';

export type HarvestFormClassificationDraft = {
  id: string;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  traderId: string;
  customerId: string;
  traderCategoryId: string;
  customerCategoryId: string;
  notes: string;
  quantities: GradeQuantityMatrix;
};

export type HarvestFieldReportRow = {
  id: number;
  fieldName: string;
  recordCount: number;
  badPickCount: number;
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
  totalHarvestedExcludingBadPicks: number;
  totalRejectedExcludingBadPicks: number;
  ownerHarvestedExcludingBadPicks: number;
  ownerRejectedExcludingBadPicks: number;
};

export type HarvestExportTableData = {
  header: Array<string | number>;
  rows: Array<Array<string | number>>;
};
