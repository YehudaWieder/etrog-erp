import { apiClient } from './apiClient';

export type IsraelCategoryGrade = {
  id: number;
  seasonId: number;
  categoryId: number;
  grades: Record<string, string>;
  category?: {
    id: number;
    name: string;
  } | null;
};

export type SetIsraelCategoryGradePayload = {
  seasonId: number;
  categoryId: number;
  grades: Record<string, string>;
};

export async function getIsraelCategoryGradesBySeason(
  seasonId: number,
): Promise<IsraelCategoryGrade[]> {
  return apiClient<IsraelCategoryGrade[]>(
    `/israel/category-grades?seasonId=${seasonId}`,
  );
}

export async function setIsraelCategoryGrade(
  payload: SetIsraelCategoryGradePayload,
): Promise<IsraelCategoryGrade> {
  return apiClient<IsraelCategoryGrade>('/israel/category-grades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteIsraelCategoryGrade(
  id: number,
): Promise<IsraelCategoryGrade> {
  return apiClient<IsraelCategoryGrade>(`/israel/category-grades/${id}`, {
    method: 'DELETE',
  });
}
