export type CustomerInventoryPitamStatus = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

export type CustomerInventorySummaryRow = {
  customerId: number;
  customerName: string | null;
  customerCategoryId: number;
  customerCategoryName: string | null;
  categoryGrade: string | null;
  pitamStatus: CustomerInventoryPitamStatus;
  quantity: number;
  lastUpdatedAt: string | null;
};

export type CustomerInventorySummaryTotals = {
  totalQuantity: number;
};

export type CustomerInventorySummaryResponse = {
  rows: CustomerInventorySummaryRow[];
  totals: CustomerInventorySummaryTotals;
};

export type CustomerInventorySummaryFilters = {
  seasonId: number | null;
  customerId: number | null;
  shipmentScope?:
    | 'ALL'
    | 'UNSHIPPED'
    | 'PACKED_SHIPPED'
    | 'SHIPPED'
    | 'SELF_PICKUP'
    | 'HARVEST_IN'
    | 'INTERNAL_TRANSFER'
    | 'OWNERSHIP_TRANSFER'
    | 'ASSIGNED'
    | 'WASTE'
    | 'ADJUSTMENT';
};
