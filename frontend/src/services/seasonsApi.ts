import { apiClient } from './apiClient';

export type Season = {
  id: number;
  yearName: number;
  slug: string;
  isActive: boolean;
};

export type CreateSeasonPayload = {
  yearName: number;
};

export async function getSeasons(): Promise<Season[]> {
  return apiClient<Season[]>('/seasons');
}

export async function createSeason(seasonData: CreateSeasonPayload): Promise<Season> {
  return apiClient<Season>('/seasons', {
    method: 'POST',
    body: JSON.stringify(seasonData),
  });
}

export async function setActiveSeason(seasonId: number): Promise<Season> {
  return apiClient<Season>('/seasons/set-active', {
    method: 'PATCH',
    body: JSON.stringify({ id: seasonId }),
  });
}
