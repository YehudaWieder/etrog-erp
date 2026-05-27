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

export async function getHarvestsBySeason(seasonId: number): Promise<HarvestRecord[]> {
  return apiClient<HarvestRecord[]>(`/harvests?seasonId=${seasonId}`);
}
