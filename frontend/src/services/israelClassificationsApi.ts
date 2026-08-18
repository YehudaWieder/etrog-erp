import { apiClient } from './apiClient';

export type IsraelPitamStatus = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

export type IsraelClassificationRecord = {
  id: number;
  seasonId: number;
  harvestId: number;
  fieldCategoryId: number;
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes: string | null;
  category?: { id: number; name: string };
  fieldCategory?: { id: number; name: string };
  harvest?: {
    id: number;
    quantity: number;
    field?: { id: number; name: string };
  };
};

export type CreateIsraelClassificationPayload = {
  harvestId: number;
  fieldCategoryId: number;
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes?: string;
};

export async function getIsraelClassificationsByHarvest(
  harvestId: number,
): Promise<IsraelClassificationRecord[]> {
  return apiClient<IsraelClassificationRecord[]>(
    `/israel/classifications?harvestId=${harvestId}`,
  );
}

export async function createIsraelClassification(
  payload: CreateIsraelClassificationPayload,
): Promise<IsraelClassificationRecord> {
  return apiClient<IsraelClassificationRecord>('/israel/classifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
