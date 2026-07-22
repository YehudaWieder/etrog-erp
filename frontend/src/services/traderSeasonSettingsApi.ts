import { apiClient } from './apiClient';

export type Currency = 'ILS' | 'USD' | 'EUR';

export type TraderSeasonSettings = {
  id: number;
  seasonId: number;
  traderId: number;
  paymentPercent: number | string;
  pricePerEtrog: number | string;
  currency: Currency;
  trader?: {
    name: string;
  } | null;
};

export type SetTraderSeasonSettingsPayload = {
  seasonId: number;
  traderId: number;
  paymentPercent: number;
  pricePerEtrog: number;
  currency?: Currency;
};

export async function getTraderSeasonSettingsBySeason(seasonId: number): Promise<TraderSeasonSettings[]> {
  return apiClient<TraderSeasonSettings[]>(`/trader-season-settings?seasonId=${seasonId}`);
}

export async function setTraderSeasonSettings(
  payload: SetTraderSeasonSettingsPayload,
): Promise<TraderSeasonSettings> {
  return apiClient<TraderSeasonSettings>('/trader-season-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTraderSeasonSettings(id: number): Promise<TraderSeasonSettings> {
  return apiClient<TraderSeasonSettings>(`/trader-season-settings/${id}`, {
    method: 'DELETE',
  });
}
