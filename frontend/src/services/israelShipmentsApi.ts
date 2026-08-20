import { apiClient, type ApiClientInit } from './apiClient';

export type IsraelShipmentStatus = 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type IsraelShipmentRecord = {
  id: number;
  shipmentNumber: number;
  seasonId: number;
  totalBoxes: number;
  totalQuantity: number;
  status: IsraelShipmentStatus;
  shippedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { name: string };
};

export type CreateIsraelShipmentPayload = {
  seasonId: number;
  shipmentNumber: number;
  notes?: string;
};

export type UpdateIsraelShipmentPayload = {
  id: number;
  shipmentNumber?: number;
  status?: IsraelShipmentStatus;
  shippedAt?: string | null;
  notes?: string | null;
};

export async function getIsraelShipmentsBySeason(seasonId: number): Promise<IsraelShipmentRecord[]> {
  return apiClient<IsraelShipmentRecord[]>(`/israel/shipments?seasonId=${seasonId}`);
}

export async function createIsraelShipment(
  payload: CreateIsraelShipmentPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelShipmentRecord> {
  return apiClient<IsraelShipmentRecord>('/israel/shipments', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function updateIsraelShipment(
  payload: UpdateIsraelShipmentPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelShipmentRecord> {
  return apiClient<IsraelShipmentRecord>('/israel/shipments', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function deleteIsraelShipment(
  id: number,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<void> {
  return apiClient<void>(`/israel/shipments/${id}`, {
    method: 'DELETE',
    ...init,
  });
}
