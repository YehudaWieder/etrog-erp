import { apiClient } from './apiClient';

export type BoxStatus = 'OPEN' | 'CLOSED' | 'SHIPPED';
export type BoxOwnership = 'TRADER' | 'CUSTOMER' | 'SHARED' | 'UNASSIGNED' | 'CUSTOM';

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
  createdAt: string;
  updatedAt: string;
  notes: string | null;
};

export async function getBoxesByShipment(shipmentId: number): Promise<BoxRecord[]> {
  return apiClient<BoxRecord[]>(`/boxes/shipment/${shipmentId}`);
}
