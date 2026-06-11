import { apiClient } from './apiClient';

export type TraderInventoryRow = {
  traderId: number | null;
  traderName: string | null;
  isModulo: boolean;
  traderCategoryId: number;
  traderCategoryName: string | null;
  grade: string;
  pitamStatus: string;
  quantity: number;
};

export type CustomerInventoryRow = {
  customerId: number;
  customerName: string | null;
  customerCategoryId: number;
  customerCategoryName: string | null;
  categoryGrade: string | null;
  pitamStatus: string;
  quantity: number;
};

type InventorySummaryResponse = {
  trader: { rows: TraderInventoryRow[] };
  customer: { rows: CustomerInventoryRow[] };
};

export async function getTraderAvailableInventory(
  traderId: number,
  source: 'GENERAL' | 'PRIVATE_SELECTION' = 'GENERAL',
): Promise<TraderInventoryRow[]> {
  const params =
    source === 'PRIVATE_SELECTION'
      ? `ownerScope=TRADER&traderId=${traderId}&movementScope=PRIVATE_SELECTION`
      : `ownerScope=TRADER&traderId=${traderId}&excludePrivateSelection=true`;
  const result = await apiClient<InventorySummaryResponse>(`/inventory/summary?${params}`);
  return result.trader.rows.filter((row) => !row.isModulo && row.quantity > 0);
}

export async function getCustomerAvailableInventory(customerId: number): Promise<CustomerInventoryRow[]> {
  const result = await apiClient<InventorySummaryResponse>(
    `/inventory/summary?customerId=${customerId}`,
  );
  return result.customer.rows.filter((row) => row.quantity > 0);
}

export async function getAllTradersAvailableInventory(): Promise<TraderInventoryRow[]> {
  const result = await apiClient<InventorySummaryResponse>(`/inventory/summary?excludePrivateSelection=true`);
  return result.trader.rows.filter((row) => row.quantity > 0);
}
