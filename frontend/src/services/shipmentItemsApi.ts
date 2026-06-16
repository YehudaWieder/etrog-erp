import { apiClient } from './apiClient';

export type ItemOwnership = 'TRADER' | 'CUSTOMER' | 'UNASSIGNED' | 'CUSTOM';

export type ShipmentItemRecord = {
  id: number;
  shipmentId: number;
  boxId: number;
  seasonId: number;
  traderCategoryId: number | null;
  customerCategoryId: number | null;
  quantity: number;
  pitamStatus: string | null;
  grade: string | null;
  ownershipType: ItemOwnership;
  traderId: number | null;
  customerId: number | null;
  trader?: { name: string } | null;
  customer?: { customerName: string } | null;
  traderCategory?: { name: string } | null;
  customerCategory?: { name: string } | null;
  updatedBy?: { name: string } | null;
  isPrivateSelection: boolean;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  customLabel: string | null;
  customGrade: string | null;
};

export async function getShipmentItemsByBox(boxId: number): Promise<ShipmentItemRecord[]> {
  return apiClient<ShipmentItemRecord[]>(`/shipment-items/box/${boxId}`);
}

export type UpdateShipmentItemPayload = {
  id: number;
  quantity?: number;
  pitamStatus?: string;
  notes?: string | null;
};

export type ShipmentItemEditLimits = {
  currentQuantity: number;
  maxQuantity: number | null;
  boxSpaceFree: number | null;
  inventoryAvailable: number | null;
};

export async function getShipmentItemEditLimits(itemId: number): Promise<ShipmentItemEditLimits> {
  return apiClient<ShipmentItemEditLimits>(`/shipment-items/${itemId}/edit-limits`);
}

export async function updateShipmentItem(
  payload: UpdateShipmentItemPayload,
  options?: { suppressGlobalFeedback?: boolean },
): Promise<ShipmentItemRecord> {
  return apiClient<ShipmentItemRecord>('/shipment-items', {
    method: 'PATCH',
    body: JSON.stringify(payload),
    suppressGlobalFeedback: options?.suppressGlobalFeedback,
  });
}

export async function deleteShipmentItem(
  id: number,
  options?: { suppressGlobalFeedback?: boolean },
): Promise<ShipmentItemRecord> {
  return apiClient<ShipmentItemRecord>(`/shipment-items/${id}`, {
    method: 'DELETE',
    suppressGlobalFeedback: options?.suppressGlobalFeedback,
  });
}
