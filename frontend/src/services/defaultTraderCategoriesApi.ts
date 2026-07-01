import { apiClient } from './apiClient';

export type DefaultTraderCategoryShare = {
  traderId: number;
  traderName: string;
  percent: number;
};

export type DefaultTraderCategory = {
  id: number;
  name: string;
  notes?: string | null;
  supportedGrades: string[];
  orderIndex: number;
  shares: DefaultTraderCategoryShare[];
  totalPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDefaultTraderCategoryWithSharesPayload = {
  name: string;
  notes?: string;
  supportedGrades?: string[];
  shares: Array<{
    traderId: number;
    percent: number;
  }>;
};

export type UpdateDefaultTraderCategoryPayload = {
  id: number;
  name?: string;
  notes?: string;
  supportedGrades?: string[];
};

export type CreateDefaultTraderCategorySharePayload = {
  defaultTraderCategoryId: number;
  traderId: number;
  percent: number;
};

export type UpdateDefaultTraderCategorySharePayload = {
  defaultTraderCategoryId: number;
  traderId: number;
  percent: number;
};

export async function getDefaultTraderCategories(): Promise<DefaultTraderCategory[]> {
  return apiClient<DefaultTraderCategory[]>('/default-trader-categories');
}

export async function createDefaultTraderCategoryWithShares(
  payload: CreateDefaultTraderCategoryWithSharesPayload,
): Promise<DefaultTraderCategory> {
  return apiClient<DefaultTraderCategory>('/default-trader-categories/with-shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDefaultTraderCategory(
  payload: UpdateDefaultTraderCategoryPayload,
): Promise<DefaultTraderCategory> {
  return apiClient<DefaultTraderCategory>('/default-trader-categories', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createDefaultTraderCategoryShare(
  payload: CreateDefaultTraderCategorySharePayload,
): Promise<void> {
  await apiClient('/default-trader-categories/shares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDefaultTraderCategoryShare(
  payload: UpdateDefaultTraderCategorySharePayload,
): Promise<void> {
  await apiClient('/default-trader-categories/shares', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDefaultTraderCategoryShare(
  categoryId: number,
  traderId: number,
): Promise<void> {
  await apiClient(`/default-trader-categories/${categoryId}/shares/${traderId}`, {
    method: 'DELETE',
  });
}

export async function deleteDefaultTraderCategory(categoryId: number): Promise<{ id: number }> {
  return apiClient<{ id: number }>(`/default-trader-categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function reorderDefaultTraderCategories(
  orderedIds: number[],
): Promise<{ orderedIds: number[] }> {
  return apiClient<{ orderedIds: number[] }>('/default-trader-categories/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });
}
