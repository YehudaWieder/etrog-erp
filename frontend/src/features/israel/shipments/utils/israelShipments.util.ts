import type { IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelBoxStatus } from '../../../../services/israel/israelBoxesApi';

export const ISRAEL_SHIPMENT_STATUS_CSS_CLASS: Record<IsraelShipmentStatus, string> = {
  PREPARING: 'status-preparing',
  SHIPPED: 'status-shipped',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

export function resolveIsraelShipmentStatusClass(status: IsraelShipmentStatus): string {
  return ISRAEL_SHIPMENT_STATUS_CSS_CLASS[status] ?? 'status-preparing';
}

export function parseIsraelShipmentSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function formatIsraelShipmentDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function parseIsraelShipmentStatusFilter(value: string): 'all' | IsraelShipmentStatus {
  if (value === 'all') {
    return 'all';
  }

  if (value === 'PREPARING' || value === 'SHIPPED' || value === 'DELIVERED' || value === 'CANCELLED') {
    return value;
  }

  return 'all';
}

export const ISRAEL_BOX_STATUS_CSS_CLASS: Record<IsraelBoxStatus, string> = {
  OPEN: 'box-open',
  CLOSED: 'box-closed',
  SHIPPED: 'box-shipped',
  DELIVERED: 'box-delivered',
};

export function resolveIsraelBoxStatusClass(status: IsraelBoxStatus): string {
  return ISRAEL_BOX_STATUS_CSS_CLASS[status] ?? 'box-open';
}

const ISRAEL_BOX_STATUS_VALUES: IsraelBoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED'];

export function parseIsraelBoxStatusFilter(value: string): 'all' | IsraelBoxStatus {
  if (value === 'all') {
    return 'all';
  }

  return ISRAEL_BOX_STATUS_VALUES.includes(value as IsraelBoxStatus) ? (value as IsraelBoxStatus) : 'all';
}

export function parseIsraelBoxNumberFilter(value: string): 'all' | number {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 'all';
  }

  return parsedValue;
}
