import { apiClient } from './apiClient';

export type Field = {
  id: number;
  name: string;
  slug: string;
  includeInRejectionSummary: boolean;
};

export type CreateFieldPayload = {
  name: string;
  includeInRejectionSummary?: boolean;
};

export type UpdateFieldPayload = {
  id: number;
  name: string;
  includeInRejectionSummary?: boolean;
};

export async function getFields(): Promise<Field[]> {
  return apiClient<Field[]>('/fields');
}

export async function createField(fieldData: CreateFieldPayload): Promise<Field> {
  return apiClient<Field>('/fields', {
    method: 'POST',
    body: JSON.stringify(fieldData),
  });
}

export async function deleteField(fieldId: number): Promise<Field> {
  return apiClient<Field>(`/fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export async function updateField(fieldData: UpdateFieldPayload): Promise<Field> {
  return apiClient<Field>('/fields', {
    method: 'PATCH',
    body: JSON.stringify(fieldData),
  });
}
