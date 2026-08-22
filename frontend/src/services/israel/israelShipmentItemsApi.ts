import { apiClient, type ApiClientInit } from '../apiClient';
import type { IsraelPitamStatus } from './israelClassificationsApi';

export type IsraelShipmentItemRecord = {
  id: number;
  boxId: number;
  box?: { id: number; boxNumber: number; shipment: { id: number; shipmentNumber: number } | null };
  seasonId: number;
  categoryId: number;
  category?: { id: number; name: string };
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: { name: string };
};

export type CreateIsraelShipmentItemPayload = {
  boxId: number;
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes?: string;
};

export type UpdateIsraelShipmentItemPayload = {
  id: number;
  quantity?: number;
  notes?: string | null;
};

export type PackIsraelShipmentItemRowPayload = {
  categoryId: number;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  quantity: number;
  notes?: string;
};

export type PackIsraelShipmentItemsPayload = {
  boxId: number;
  items: PackIsraelShipmentItemRowPayload[];
};

export async function getIsraelShipmentItemsBySeason(seasonId: number): Promise<IsraelShipmentItemRecord[]> {
  return apiClient<IsraelShipmentItemRecord[]>(`/israel/shipment-items?seasonId=${seasonId}`);
}

export async function getIsraelShipmentItemsByBox(boxId: number): Promise<IsraelShipmentItemRecord[]> {
  return apiClient<IsraelShipmentItemRecord[]>(`/israel/shipment-items/box/${boxId}`);
}

export async function createIsraelShipmentItem(
  payload: CreateIsraelShipmentItemPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelShipmentItemRecord> {
  return apiClient<IsraelShipmentItemRecord>('/israel/shipment-items', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function packIsraelShipmentItems(
  payload: PackIsraelShipmentItemsPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelShipmentItemRecord[]> {
  return apiClient<IsraelShipmentItemRecord[]>('/israel/shipment-items/pack', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function updateIsraelShipmentItem(
  payload: UpdateIsraelShipmentItemPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<IsraelShipmentItemRecord> {
  return apiClient<IsraelShipmentItemRecord>('/israel/shipment-items', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function deleteIsraelShipmentItem(
  id: number,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<void> {
  return apiClient<void>(`/israel/shipment-items/${id}`, {
    method: 'DELETE',
    ...init,
  });
}
