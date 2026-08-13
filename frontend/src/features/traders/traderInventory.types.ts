export type TraderInventoryPitamStatus = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

export type TraderInventorySummaryRow = {
  traderId: number | null;
  traderName: string | null;
  isModulo: boolean;
  traderCategoryId: number;
  traderCategoryName: string | null;
  grade: string;
  pitamStatus: TraderInventoryPitamStatus;
  quantity: number;
  lastUpdatedAt: string | null;
};

export type TraderInventorySummaryTotals = {
  totalQuantity: number;
  moduloQuantity: number;
  traderQuantity: number;
  remainsInItalyQuantity: number;
  privateSelectionQuantity: number;
};

export type TraderInventorySummaryResponse = {
  rows: TraderInventorySummaryRow[];
  totals: TraderInventorySummaryTotals;
};

export type TraderInventorySummaryFilters = {
  seasonId: number | null;
  traderId: number | null;
  ownerScope: 'ALL' | 'TRADER' | 'MODULO';
  shipmentScope?: 'ALL' | 'UNSHIPPED' | 'PACKED_SHIPPED' | 'SHIPPED' | 'SELF_PICKUP' | 'HARVEST_IN' | 'INTERNAL_TRANSFER' | 'TRANSFERRED_TO_CUSTOMER' | 'OWNERSHIP_TRANSFER' | 'ASSIGNED' | 'WASTE' | 'ADJUSTMENT' | 'REMAINS_IN_ITALY' | 'PRIVATE_SELECTION';
  sourceScope?: 'ALL' | 'GENERAL' | 'PRIVATE_SELECTION';
};