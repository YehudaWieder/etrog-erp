import { apiClient } from './apiClient';
import type { GradeGroup } from './traderCategoriesApi';

export type IsraelSortCategory = {
  id: number;
  name: string;
  notes: string | null;
  supportedGrades: string[];
  gradeGroups: GradeGroup[];
  orderIndex: number;
};

export type CreateIsraelSortCategoryPayload = {
  name: string;
  notes?: string;
  supportedGrades: string[];
  gradeGroups: GradeGroup[];
};

export type UpdateIsraelSortCategoryPayload = {
  id: number;
  name: string;
  notes?: string;
  supportedGrades: string[];
  gradeGroups: GradeGroup[];
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

export async function reorderIsraelSortCategories(
  orderedIds: number[],
): Promise<{ orderedIds: number[] }> {
  return apiClient<{ orderedIds: number[] }>(
    '/israel/sort-categories/reorder',
    {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    },
  );
}
