import { apiClient } from '../apiClient';

export type IsraelField = {
  id: number;
  name: string;
};

export type CreateIsraelFieldPayload = {
  name: string;
};

export type UpdateIsraelFieldPayload = {
  id: number;
  name: string;
};

export async function getIsraelFields(): Promise<IsraelField[]> {
  return apiClient<IsraelField[]>('/israel/fields');
}

export async function createIsraelField(
  fieldData: CreateIsraelFieldPayload,
): Promise<IsraelField> {
  return apiClient<IsraelField>('/israel/fields', {
    method: 'POST',
    body: JSON.stringify(fieldData),
  });
}

export async function deleteIsraelField(fieldId: number): Promise<IsraelField> {
  return apiClient<IsraelField>(`/israel/fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export async function updateIsraelField(
  fieldData: UpdateIsraelFieldPayload,
): Promise<IsraelField> {
  return apiClient<IsraelField>('/israel/fields', {
    method: 'PATCH',
    body: JSON.stringify(fieldData),
  });
}
