import { apiClient } from './apiClient';

type ClassificationTrader = {
  name: string;
};

type ClassificationCustomer = {
  customerName: string;
};

type ClassificationTraderCategory = {
  name: string;
};

type ClassificationCustomerCategory = {
  name: string;
  grade?: string | null;
};

type ClassificationUpdatedBy = {
  name: string;
};

export type ClassificationRecord = {
  id: number;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER' | string;
  grade?: string | null;
  pitamStatus?: string | null;
  quantity: number;
  notes?: string | null;
  trader?: ClassificationTrader | null;
  customer?: ClassificationCustomer | null;
  traderCategory?: ClassificationTraderCategory | null;
  customerCategory?: ClassificationCustomerCategory | null;
  updatedBy?: ClassificationUpdatedBy | null;
};

export type CreateHarvestClassificationPayload = {
  harvestId: number;
  isPartialClassification: boolean;
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

export type ClassificationDailySummaryCategory = {
  key: string;
  label: string;
  ownerType?: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  ownerName?: string | null;
  categoryName?: string;
  total: number;
};

export type ClassificationDailySummaryRow = {
  harvestId: number;
  fieldId: number;
  fieldName: string;
  dateGregorian: string;
  dateHebrew: string;
  totalSorted: number;
  categoryTotals: Record<string, number>;
};

export type ClassificationDailySummaryResponse = {
  categories: ClassificationDailySummaryCategory[];
  rows: ClassificationDailySummaryRow[];
};

export type ClassificationListRecord = {
  id: number;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER' | string;
  traderId?: number | null;
  customerId?: number | null;
  traderCategoryId?: number | null;
  customerCategoryId?: number | null;
  grade?: string | null;
  pitamStatus?: string | null;
  quantity: number;
  notes?: string | null;
  trader?: { name: string } | null;
  customer?: { customerName: string } | null;
  traderCategory?: { name: string } | null;
  customerCategory?: { name: string; grade?: string | null } | null;
  updatedBy?: { name: string } | null;
  fieldHarvest?: {
    id: number;
    fieldId: number;
    dateGregorian: string;
    dateHebrew: string;
    isPartialClassification?: boolean | null;
    totalAfterRejected?: number;
    classifiedTotal?: number;
    field?: { name: string } | null;
  } | null;
};

export async function getClassificationsByHarvest(harvestId: number): Promise<ClassificationRecord[]> {
  return apiClient<ClassificationRecord[]>(`/classifications/harvest/${harvestId}`);
}

export async function getClassificationsBySeason(seasonId: number): Promise<ClassificationListRecord[]> {
  return apiClient<ClassificationListRecord[]>(`/classifications?seasonId=${seasonId}`);
}

export async function getDeletedClassificationsBySeason(seasonId: number): Promise<ClassificationListRecord[]> {
  return apiClient<ClassificationListRecord[]>(`/classifications/deleted?seasonId=${seasonId}`);
}

export async function getClassificationDailySummaryBySeason(seasonId: number): Promise<ClassificationDailySummaryResponse> {
  return apiClient<ClassificationDailySummaryResponse>(`/classifications/daily-summary?seasonId=${seasonId}`);
}

export async function deleteHarvestClassification(payload: {
  harvestId: number;
  classificationId: number;
  isPartialClassification: boolean;
}): Promise<void> {
  await apiClient<void>('/harvests/classifications', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export async function createHarvestClassification(
  payload: CreateHarvestClassificationPayload,
): Promise<ClassificationRecord> {
  return apiClient<ClassificationRecord>('/harvests/classifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHarvestClassificationQuantity(payload: {
  harvestId: number;
  classificationId: number;
  isPartialClassification: boolean;
  quantity: number;
}): Promise<void> {
  await apiClient<void>('/harvests/classifications', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function restoreHarvestClassification(
  payload: CreateHarvestClassificationPayload & { deletedClassificationId: number },
): Promise<ClassificationRecord> {
  return apiClient<ClassificationRecord>('/harvests/classifications/restore', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function permanentDeleteHarvestClassification(classificationId: number): Promise<void> {
  await apiClient<void>(`/harvests/classifications/${classificationId}/permanent`, {
    method: 'DELETE',
  });
}

export type HarvestSortingBatchEdit = {
  classificationId: number;
  quantity: number;
};

export type HarvestSortingBatchCreateItem = {
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

export type HarvestSortingBatchHarvestUpdate = {
  totalHarvested?: number;
  totalRejected?: number;
  ownerHarvested?: number;
  ownerRejected?: number;
  notes?: string;
  isBadPick?: boolean;
  remainsInItalyGradeH?: boolean;
  remainsInItalyGradeV?: boolean;
};

// Edits existing classifications, creates new ones, and optionally applies an inline harvest field
// change (e.g. added rejected quantity) — all on the same harvest, in a single backend transaction.
// Either everything is saved, or nothing is.
export async function saveHarvestSortingBatch(payload: {
  harvestId: number;
  isPartialClassification: boolean;
  edits: HarvestSortingBatchEdit[];
  creates: HarvestSortingBatchCreateItem[];
  harvestUpdate?: HarvestSortingBatchHarvestUpdate;
}): Promise<{ editedCount: number; created: ClassificationRecord[] }> {
  return apiClient<{ editedCount: number; created: ClassificationRecord[] }>('/harvests/classifications/batch', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
