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
  ownershipType: ItemOwnership;
  traderId: number | null;
  customerId: number | null;
  trader?: { name: string } | null;
  customer?: { customerName: string } | null;
  traderCategory?: { name: string } | null;
  customerCategory?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
};

export async function getShipmentItemsByBox(boxId: number): Promise<ShipmentItemRecord[]> {
  return apiClient<ShipmentItemRecord[]>(`/shipment-items/box/${boxId}`);
}
