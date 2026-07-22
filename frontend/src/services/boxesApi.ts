import { apiClient, type ApiClientInit } from './apiClient';

export type BoxStatus = 'OPEN' | 'CLOSED' | 'SHIPPED' | 'DELIVERED';
export type BoxOwnership = 'TRADER' | 'CUSTOMER' | 'SHARED' | 'GENERAL' | 'CUSTOM' | 'EXTERNAL_TRADER';

export type OpenBoxRecord = {
  id: number;
  boxNumber: number;
  boxType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  totalQuantity: number;
  capacity: number | null;
  ownershipType: BoxOwnership;
  traderId: number | null;
  customerId: number | null;
  externalOwnerName: string | null;
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
  externalOwnerName: string | null;
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
  boxType?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  status?: BoxStatus;
  ownershipType?: BoxOwnership;
  traderId?: number;
  customerId?: number;
  externalOwnerName?: string;
  notes?: string;
};

export type CreateBoxesBulkPayload = {
  shipmentId: number;
  startNumber: number;
  endNumber: number;
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
  externalOwnerName?: string | null;
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

export async function deleteBoxesBulk(
  ids: number[],
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<{ deleted: boolean; ids: number[] }> {
  return apiClient<{ deleted: boolean; ids: number[] }>('/boxes/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
    ...init,
  });
}

export async function getBoxesByShipment(shipmentId: number): Promise<BoxRecord[]> {
  return apiClient<BoxRecord[]>(`/boxes/shipment/${shipmentId}`);
}

export type PackBoxItemPayload = {
  traderCategoryId?: number;
  customerCategoryId?: number;
  grade?: string;
  pitamStatus: string;
  quantity: number;
  notes?: string;
  ownershipType?: string;
  traderId?: number;
  customerId?: number;
  isPrivateSelection?: boolean;
  customLabel?: string;
  customGrade?: string;
};

export type PackBoxItemEditPayload = {
  id: number;
  quantity: number;
};

export type PackBoxPayload = UpdateBoxPayload & {
  items: PackBoxItemPayload[];
  itemEdits?: PackBoxItemEditPayload[];
};

export async function packBox(
  payload: PackBoxPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<{ box: BoxRecord; items: unknown[]; editedItems: unknown[] }> {
  return apiClient<{ box: BoxRecord; items: unknown[]; editedItems: unknown[] }>('/boxes/pack', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  });
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

export async function createBoxesBulk(
  payload: CreateBoxesBulkPayload,
  init?: Pick<ApiClientInit, 'suppressGlobalFeedback'>,
): Promise<BoxRecord[]> {
  return apiClient<BoxRecord[]>('/boxes/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  });
}
