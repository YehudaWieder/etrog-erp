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

export type IsraelClassificationSeasonRecord = {
  id: number;
  seasonId: number;
  harvestId: number;
  fieldCategoryId: number;
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes: string | null;
  category?: {
    id: number;
    name: string;
    orderIndex: number;
    gradeGroups: { name: string; grades: string[] }[];
  };
  fieldCategory?: { id: number; name: string };
  harvest?: {
    id: number;
    fieldId: number;
    dateGregorian: string;
    dateHebrew: string | null;
    field?: { id: number; name: string };
  };
};

export async function getIsraelClassificationsByHarvest(
  harvestId: number,
): Promise<IsraelClassificationRecord[]> {
  return apiClient<IsraelClassificationRecord[]>(
    `/israel/classifications?harvestId=${harvestId}`,
  );
}

export async function getIsraelClassificationsBySeason(
  seasonId: number,
): Promise<IsraelClassificationSeasonRecord[]> {
  return apiClient<IsraelClassificationSeasonRecord[]>(
    `/israel/classifications/season?seasonId=${seasonId}`,
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
