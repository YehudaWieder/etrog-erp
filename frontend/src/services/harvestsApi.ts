import { apiClient } from './apiClient';

type HarvestNestedField = {
  name: string;
};

type HarvestNestedUser = {
  name: string;
};

export type HarvestRecord = {
  id: number;
  seasonId: number;
  fieldId: number;
  dateGregorian: string;
  dateHebrew: string;
  totalHarvested: number;
  totalRejected: number;
  totalAfterRejected: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  classifiedTotal: number;
  isPartialClassification: boolean;
  notes: string | null;
  updatedAt: string;
  rejectionRate: number | string;
  ownerRejectionRate: number | string;
  field?: HarvestNestedField;
  updatedBy?: HarvestNestedUser;
};

export type HarvestFieldTotalsRecord = {
  fieldId: number;
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

export type HarvestFieldReportDetailsRecord = HarvestFieldTotalsRecord & {
  seasonName: string;
  rows: HarvestRecord[];
};

export async function getHarvestsBySeason(seasonId: number): Promise<HarvestRecord[]> {
  return apiClient<HarvestRecord[]>(`/harvests?seasonId=${seasonId}`);
}

export async function getHarvestFieldTotalsBySeason(seasonId: number): Promise<HarvestFieldTotalsRecord[]> {
  return apiClient<HarvestFieldTotalsRecord[]>(`/harvests/field-totals?seasonId=${seasonId}`);
}

export async function getHarvestFieldReportDetailsBySeasonAndField(
  seasonId: number,
  fieldId: number,
): Promise<HarvestFieldReportDetailsRecord> {
  return apiClient<HarvestFieldReportDetailsRecord>(`/harvests/field-details?seasonId=${seasonId}&fieldId=${fieldId}`);
}
