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

export type HarvestBulkClassificationPayload = {
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  traderId?: number;
  customerId?: number;
  traderCategoryId?: number;
  customerCategoryId?: number;
  grade?: string;
  pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';
  quantity: number;
  notes?: string;
};

export type CreateHarvestWithClassificationsPayload = {
  dateGregorian: string;
  dateHebrew: string;
  fieldId: number;
  updatedById?: number;
  totalHarvested?: number;
  totalRejected?: number;
  ownerHarvested?: number;
  ownerRejected?: number;
  notes?: string;
  isPartialClassification?: boolean;
  classifications: HarvestBulkClassificationPayload[];
};

export async function getHarvestsBySeason(seasonId: number): Promise<HarvestRecord[]> {
  return apiClient<HarvestRecord[]>(`/harvests?seasonId=${seasonId}`);
}

export async function getHarvestById(id: number): Promise<HarvestRecord> {
  return apiClient<HarvestRecord>(`/harvests/${id}`);
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

export async function createHarvestWithClassifications(
  payload: CreateHarvestWithClassificationsPayload,
): Promise<HarvestRecord> {
  return apiClient<HarvestRecord>('/harvests/bulk-with-classifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteHarvest(id: number): Promise<void> {
  await apiClient<void>(`/harvests/${id}`, { method: 'DELETE' });
}

export type UpdateHarvestPayload = {
  id: number;
  fieldId?: number;
  totalHarvested?: number;
  totalRejected?: number;
  ownerHarvested?: number;
  ownerRejected?: number;
  notes?: string;
};

export async function updateHarvest(payload: UpdateHarvestPayload): Promise<HarvestRecord> {
  return apiClient<HarvestRecord>('/harvests', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateHarvestPartialClassification(payload: { id: number; isPartialClassification: boolean }): Promise<HarvestRecord> {
  return apiClient<HarvestRecord>('/harvests/partial-classification', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAllSortingsByHarvest(harvestId: number): Promise<void> {
  await apiClient<void>(`/harvests/${harvestId}/sortings`, { method: 'DELETE' });
}
