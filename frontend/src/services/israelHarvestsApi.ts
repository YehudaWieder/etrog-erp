import { apiClient } from './apiClient';

export type IsraelHarvestRecord = {
  id: number;
  seasonId: number;
  fieldId: number;
  dateGregorian: string;
  dateHebrew: string;
  quantity: number;
  notes: string | null;
  updatedAt: string;
  field?: { id: number; name: string };
  updatedBy?: { name: string };
};

export type CreateIsraelHarvestPayload = {
  seasonId: number;
  fieldId: number;
  dateGregorian: string;
  dateHebrew: string;
  quantity: number;
  notes?: string;
};

export type UpdateIsraelHarvestPayload = Partial<Omit<CreateIsraelHarvestPayload, 'seasonId'>>;

export async function getIsraelHarvestsBySeason(seasonId: number): Promise<IsraelHarvestRecord[]> {
  return apiClient<IsraelHarvestRecord[]>(`/israel/harvests?seasonId=${seasonId}`);
}

export async function createIsraelHarvest(
  payload: CreateIsraelHarvestPayload,
): Promise<IsraelHarvestRecord> {
  return apiClient<IsraelHarvestRecord>('/israel/harvests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIsraelHarvest(
  id: number,
  payload: UpdateIsraelHarvestPayload,
): Promise<IsraelHarvestRecord> {
  return apiClient<IsraelHarvestRecord>(`/israel/harvests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIsraelHarvest(id: number): Promise<IsraelHarvestRecord> {
  return apiClient<IsraelHarvestRecord>(`/israel/harvests/${id}`, {
    method: 'DELETE',
  });
}
