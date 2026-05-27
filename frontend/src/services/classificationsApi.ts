import { apiClient } from './apiClient';

type ClassificationTrader = {
  name: string;
};

type ClassificationCustomer = {
  customerName: string;
};

type ClassificationTraderCategory = {
  name: string;
};

type ClassificationCustomerCategory = {
  name: string;
  grade?: string | null;
};

type ClassificationUpdatedBy = {
  name: string;
};

export type ClassificationRecord = {
  id: number;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER' | string;
  grade?: string | null;
  pitamStatus?: string | null;
  quantity: number;
  notes?: string | null;
  trader?: ClassificationTrader | null;
  customer?: ClassificationCustomer | null;
  traderCategory?: ClassificationTraderCategory | null;
  customerCategory?: ClassificationCustomerCategory | null;
  updatedBy?: ClassificationUpdatedBy | null;
};

export async function getClassificationsByHarvest(harvestId: number): Promise<ClassificationRecord[]> {
  return apiClient<ClassificationRecord[]>(`/classifications/harvest/${harvestId}`);
}
