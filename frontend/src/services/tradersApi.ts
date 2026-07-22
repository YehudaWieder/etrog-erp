import { apiClient } from './apiClient';

export type Trader = {
  id: number;
  name: string;
  slug?: string;
};

export type CreateTraderPayload = {
  name: string;
};

export type UpdateTraderPayload = {
  id: number;
  name?: string;
};

export async function getTraders(): Promise<Trader[]> {
  return apiClient<Trader[]>('/traders');
}

export async function createTrader(traderData: CreateTraderPayload): Promise<Trader> {
  return apiClient<Trader>('/traders', {
    method: 'POST',
    body: JSON.stringify(traderData),
  });
}

export async function updateTrader(traderData: UpdateTraderPayload): Promise<Trader> {
  return apiClient<Trader>('/traders', {
    method: 'PATCH',
    body: JSON.stringify(traderData),
  });
}

export async function deleteTrader(traderId: number): Promise<Trader> {
  return apiClient<Trader>(`/traders/${traderId}`, {
    method: 'DELETE',
  });
}