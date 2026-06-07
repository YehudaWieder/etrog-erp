import { apiClient } from './apiClient';

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

export async function getShipmentsBySeason(seasonId: number): Promise<ShipmentRecord[]> {
  return apiClient<ShipmentRecord[]>(`/shipments?seasonId=${seasonId}`);
}
