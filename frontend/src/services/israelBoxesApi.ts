import { apiClient, type ApiClientInit } from './apiClient';

export type IsraelBoxStatus = 'OPEN' | 'CLOSED' | 'SHIPPED' | 'DELIVERED';

export type IsraelBoxRecord = {
  id: number;
  seasonId: number;
  shipmentId: number | null;
  shipment?: { id: number; shipmentNumber: number } | null;
  boxNumber: number;
  itemsCount: number;
  status: IsraelBoxStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { name: string };
};

export type CreateIsraelBoxPayload = {
  seasonId: number;
  boxNumber: number;
  shipmentId?: number;
  notes?: string;
};

export type CreateIsraelBoxesBulkPayload = {
  seasonId: number;
  shipmentId?: number;
  startNumber: number;
  endNumber: number;
};

export type UpdateIsraelBoxPayload = {
  id: number;
  boxNumber?: number;
  shipmentId?: number | null;
  status?: IsraelBoxStatus;
  notes?: string | null;
};

export async function getIsraelBoxesBySeason(seasonId: number): Promise<IsraelBoxRecord[]> {
  return apiClient<IsraelBoxRecord[]>(`/israel/boxes?seasonId=${seasonId}`);
}

export async function getIsraelBoxById(id: number): Promise<IsraelBoxRecord> {
  return apiClient<IsraelBoxRecord>(`/israel/boxes/${id}`);
}

export async function createIsraelBox(
  payload: CreateIsraelBoxPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelBoxRecord> {
  return apiClient<IsraelBoxRecord>('/israel/boxes', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function createIsraelBoxesBulk(
  payload: CreateIsraelBoxesBulkPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelBoxRecord[]> {
  return apiClient<IsraelBoxRecord[]>('/israel/boxes/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function updateIsraelBox(
  payload: UpdateIsraelBoxPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelBoxRecord> {
  return apiClient<IsraelBoxRecord>('/israel/boxes', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function deleteIsraelBox(
  id: number,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<void> {
  return apiClient<void>(`/israel/boxes/${id}`, {
    method: 'DELETE',
    ...init,
  });
}

export async function deleteIsraelBoxesBulk(
  ids: number[],
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<{ deleted: boolean; ids: number[] }> {
  return apiClient<{ deleted: boolean; ids: number[] }>('/israel/boxes/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
    ...init,
  });
}
