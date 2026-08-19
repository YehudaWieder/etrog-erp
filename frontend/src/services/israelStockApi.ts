import { apiClient } from './apiClient';
import type { IsraelPitamStatus } from './israelClassificationsApi';

export type IsraelStockMovementType =
  | 'HARVEST_IN'
  | 'PACKED_SHIPPED'
  | 'SELF_PICKUP'
  | 'WASTE'
  | 'ADJUSTMENT';

export type IsraelManualMovementType = 'SELF_PICKUP' | 'WASTE';

export type IsraelStockRecord = {
  id: number;
  seasonId: number;
  date: string;
  fieldId: number | null;
  field?: { id: number; name: string } | null;
  categoryId: number;
  category?: { id: number; name: string };
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  type: IsraelStockMovementType;
  notes: string | null;
  movementReferenceId: number | null;
};

export type CreateIsraelStockMovementPayload = {
  seasonId: number;
  date: string;
  fieldId: number;
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  type: IsraelManualMovementType;
  notes?: string;
};

export type UpdateIsraelStockMovementPayload = {
  quantity?: number;
  notes?: string;
};

export async function getIsraelStockBySeason(
  seasonId: number,
): Promise<IsraelStockRecord[]> {
  return apiClient<IsraelStockRecord[]>(`/israel/stock?seasonId=${seasonId}`);
}

export async function createIsraelStockMovement(
  payload: CreateIsraelStockMovementPayload,
): Promise<IsraelStockRecord> {
  return apiClient<IsraelStockRecord>('/israel/stock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIsraelStockMovement(
  id: number,
  payload: UpdateIsraelStockMovementPayload,
): Promise<IsraelStockRecord> {
  return apiClient<IsraelStockRecord>(`/israel/stock/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIsraelStockMovement(
  id: number,
): Promise<IsraelStockRecord> {
  return apiClient<IsraelStockRecord>(`/israel/stock/${id}`, {
    method: 'DELETE',
  });
}
