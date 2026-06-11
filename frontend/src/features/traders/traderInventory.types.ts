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
};

export type TraderInventorySummaryResponse = {
  rows: TraderInventorySummaryRow[];
  totals: TraderInventorySummaryTotals;
};

export type TraderInventorySummaryFilters = {
  seasonId: number | null;
  traderId: number | null;
  ownerScope: 'ALL' | 'TRADER' | 'MODULO';
  shipmentScope?: 'ALL' | 'UNSHIPPED' | 'PACKED_SHIPPED' | 'SHIPPED' | 'SELF_PICKUP' | 'PRIVATE_SELECTION' | 'HARVEST_IN' | 'INTERNAL_TRANSFER' | 'OWNERSHIP_TRANSFER' | 'ASSIGNED' | 'WASTE' | 'ADJUSTMENT';
};