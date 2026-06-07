import type { ShipmentStatus } from '../shipments.types';

export const SHIPMENT_STATUS_CSS_CLASS: Record<ShipmentStatus, string> = {
  PREPARING: 'status-preparing',
  SHIPPED: 'status-shipped',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

export function resolveShipmentStatusClass(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_CSS_CLASS[status] ?? 'status-preparing';
}

export function parseShipmentSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function parseShipmentStatusFilter(value: string): 'all' | ShipmentStatus {
  if (value === 'all') {
    return 'all';
  }

  if (value === 'PREPARING' || value === 'SHIPPED' || value === 'DELIVERED' || value === 'CANCELLED') {
    return value;
  }

  return 'all';
}
