import { apiClient, type ApiClientInit } from './apiClient';

export type ShipmentStatus = 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type ShipmentRecord = {
  id: number;
  shipmentNumber: number;
  seasonId: number;
  totalBoxes: number;
  totalQuantity: number;
  status: ShipmentStatus;
  shippedAt: string | null;
  notes: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { name: string };
};

export type CreateShipmentPayload = {
  shipmentNumber: number;
  notes?: string;
};

export type UpdateShipmentPayload = {
  id: number;
  shipmentNumber?: number;
  status?: ShipmentStatus;
  shippedAt?: string | null;
  notes?: string | null;
};

export async function getShipmentsBySeason(seasonId: number): Promise<ShipmentRecord[]> {
  return apiClient<ShipmentRecord[]>(`/shipments?seasonId=${seasonId}`);
}

export type ShipmentSummaryRecord = {
  id: number;
  shipmentNumber: number;
  status: ShipmentStatus;
  totalBoxes: number;
  totalQuantity: number;
  traderQuantity: number;
  customerQuantity: number;
};

export async function getShipmentsSummaryBySeason(seasonId: number): Promise<ShipmentSummaryRecord[]> {
  return apiClient<ShipmentSummaryRecord[]>(`/shipments/summary?seasonId=${seasonId}`);
}

export async function updateShipment(
  payload: UpdateShipmentPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<ShipmentRecord> {
  return apiClient<ShipmentRecord>('/shipments', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function deleteShipment(
  id: number,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<void> {
  return apiClient<void>(`/shipments/${id}`, {
    method: 'DELETE',
    ...init,
  });
}

export async function createShipment(
  payload: CreateShipmentPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<ShipmentRecord> {
  return apiClient<ShipmentRecord>('/shipments', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}
