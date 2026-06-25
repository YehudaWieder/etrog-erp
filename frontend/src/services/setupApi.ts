import { apiClient } from './apiClient';

export type SetupStatus = {
  hasTraders: boolean;
  hasDefaultCategories: boolean;
  hasSeasons: boolean;
  isSetupComplete: boolean;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  return apiClient<SetupStatus>('/setup/status');
}
