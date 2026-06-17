import { apiClient, type ApiClientInit } from './apiClient';

export type BoxStatus = 'OPEN' | 'CLOSED' | 'SHIPPED';
export type BoxOwnership = 'TRADER' | 'CUSTOMER' | 'SHARED' | 'GENERAL' | 'CUSTOM';

export type OpenBoxRecord = {
  id: number;
  boxNumber: number;
  boxType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  totalQuantity: number;
  capacity: number | null;
  ownershipType: BoxOwnership;
  traderId: number | null;
  customerId: number | null;
  trader: { name: string } | null;
  customer: { customerName: string } | null;
  shipment: { id: number; shipmentNumber: number };
};

export type BoxRecord = {
  id: number;
  shipmentId: number;
  seasonId: number;
  boxNumber: number;
  boxType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  totalQuantity: number;
  status: BoxStatus;
  ownershipType: BoxOwnership;
  traderId: number | null;
  customerId: number | null;
  trader?: { name: string } | null;
  customer?: { customerName: string } | null;
  updatedBy?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
};

export type CreateBoxPayload = {
  shipmentId: number;
  boxNumber: number;
  boxType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  ownershipType?: BoxOwnership;
  traderId?: number;
  customerId?: number;
  notes?: string;
};

export type UpdateBoxPayload = {
  id: number;
  shipmentId?: number;
  boxNumber?: number;
  boxType?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  status?: BoxStatus;
  notes?: string | null;
  ownershipType?: BoxOwnership;
  traderId?: number | null;
  customerId?: number | null;
};

export async function getOpenBoxes(): Promise<OpenBoxRecord[]> {
  return apiClient<OpenBoxRecord[]>('/boxes/open');
}

export async function getBoxById(id: number): Promise<BoxRecord> {
  return apiClient<BoxRecord>(`/boxes/${id}`);
}

export async function updateBox(
  payload: UpdateBoxPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<BoxRecord> {
  return apiClient<BoxRecord>('/boxes', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
}

export async function deleteBox(
  id: number,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<void> {
  return apiClient<void>(`/boxes/${id}`, {
    method: 'DELETE',
    ...init,
  });
}

export async function getBoxesByShipment(shipmentId: number): Promise<BoxRecord[]> {
  return apiClient<BoxRecord[]>(`/boxes/shipment/${shipmentId}`);
}

export async function createBox(
  payload: CreateBoxPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<BoxRecord> {
  return apiClient<BoxRecord>('/boxes', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}
