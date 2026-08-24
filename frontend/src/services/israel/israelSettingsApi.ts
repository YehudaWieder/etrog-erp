import { apiClient } from '../apiClient';

export type IsraelSettings = {
  id: number | null;
  cartonCapacity: number;
};

export type UpdateIsraelSettingsPayload = {
  cartonCapacity?: number;
};

export async function getIsraelSettings(): Promise<IsraelSettings> {
  return apiClient<IsraelSettings>('/israel/settings');
}

export async function updateIsraelSettings(
  payload: UpdateIsraelSettingsPayload,
): Promise<IsraelSettings> {
  return apiClient<IsraelSettings>('/israel/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
