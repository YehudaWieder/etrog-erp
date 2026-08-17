import { apiClient } from './apiClient';

export type Currency = 'ILS' | 'USD' | 'EUR';

export type IsraelFieldCategory = {
  id: number;
  seasonId: number;
  fieldId: number;
  name: string;
  price: number | string;
  currency: Currency;
  field?: {
    id: number;
    name: string;
  } | null;
};

export type CreateIsraelFieldCategoryPayload = {
  seasonId: number;
  fieldId: number;
  name: string;
  price: number;
  currency: Currency;
};

export type UpdateIsraelFieldCategoryPayload = {
  id: number;
  name: string;
  price: number;
  currency: Currency;
};

export async function getIsraelFieldCategoriesBySeason(
  seasonId: number,
): Promise<IsraelFieldCategory[]> {
  return apiClient<IsraelFieldCategory[]>(
    `/israel/field-categories?seasonId=${seasonId}`,
  );
}

export async function createIsraelFieldCategory(
  payload: CreateIsraelFieldCategoryPayload,
): Promise<IsraelFieldCategory> {
  return apiClient<IsraelFieldCategory>('/israel/field-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIsraelFieldCategory(
  payload: UpdateIsraelFieldCategoryPayload,
): Promise<IsraelFieldCategory> {
  return apiClient<IsraelFieldCategory>('/israel/field-categories', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIsraelFieldCategory(
  id: number,
): Promise<IsraelFieldCategory> {
  return apiClient<IsraelFieldCategory>(`/israel/field-categories/${id}`, {
    method: 'DELETE',
  });
}
