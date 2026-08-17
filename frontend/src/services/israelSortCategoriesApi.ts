import { apiClient } from './apiClient';

export type IsraelSortCategory = {
  id: number;
  name: string;
};

export type CreateIsraelSortCategoryPayload = {
  name: string;
};

export type UpdateIsraelSortCategoryPayload = {
  id: number;
  name: string;
};

export async function getIsraelSortCategories(): Promise<IsraelSortCategory[]> {
  return apiClient<IsraelSortCategory[]>('/israel/sort-categories');
}

export async function createIsraelSortCategory(
  payload: CreateIsraelSortCategoryPayload,
): Promise<IsraelSortCategory> {
  return apiClient<IsraelSortCategory>('/israel/sort-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteIsraelSortCategory(
  id: number,
): Promise<IsraelSortCategory> {
  return apiClient<IsraelSortCategory>(`/israel/sort-categories/${id}`, {
    method: 'DELETE',
  });
}

export async function updateIsraelSortCategory(
  payload: UpdateIsraelSortCategoryPayload,
): Promise<IsraelSortCategory> {
  return apiClient<IsraelSortCategory>('/israel/sort-categories', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
