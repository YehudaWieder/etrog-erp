import { apiClient } from './apiClient';

export type Currency = 'ILS' | 'USD' | 'EUR';

export const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];

export type SystemConfig = {
  id: number | null;
  seasonId: number;
  currency: Currency | null;
  unitPrice: string | null;
  smallBoxCapacity: number;
  mediumBoxCapacity: number;
  largeBoxCapacity: number;
};

export type UpdateBoxCapacitiesPayload = {
  seasonId: number;
  smallBoxCapacity?: number;
  mediumBoxCapacity?: number;
  largeBoxCapacity?: number;
};

export async function getSystemConfig(seasonId: number): Promise<SystemConfig> {
  return apiClient<SystemConfig>(`/system-config/${seasonId}`);
}

export async function updateBoxCapacities(payload: UpdateBoxCapacitiesPayload): Promise<SystemConfig> {
  return apiClient<SystemConfig>('/system-config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type UpdatePricingPayload = {
  seasonId: number;
  currency: Currency;
  unitPrice: number;
};

export async function updatePricing(payload: UpdatePricingPayload): Promise<SystemConfig> {
  return apiClient<SystemConfig>('/system-config/pricing', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
