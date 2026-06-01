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

export async function getClassificationsByHarvest(harvestId: number): Promise<ClassificationRecord[]> {
  return apiClient<ClassificationRecord[]>(`/classifications/harvest/${harvestId}`);
}

export async function getClassificationDailySummaryBySeason(seasonId: number): Promise<ClassificationDailySummaryResponse> {
  return apiClient<ClassificationDailySummaryResponse>(`/classifications/daily-summary?seasonId=${seasonId}`);
}

export async function createHarvestClassification(
  payload: CreateHarvestClassificationPayload,
): Promise<ClassificationRecord> {
  return apiClient<ClassificationRecord>('/harvests/classifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
