import type { BoxesTableRow, ShipmentItemsTableRow, ShipmentRecord } from '../shipments.types';

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type AllShipmentsSummaryTotals = {
  totalShipments: number;
  totalBoxes: number;
  totalQuantity: number;
};

export type AllBoxesSummaryTotals = {
  totalBoxes: number;
  notShipped: number;
  shipped: number;
};

export type ShipmentItemsSummaryTotals = {
  totalQuantity: number;
  traderAndGeneralQuantity: number;
  customerQuantity: number;
};

export function buildAllShipmentsSummaryTotals(rows: ShipmentRecord[]): AllShipmentsSummaryTotals {
  let totalBoxes = 0;
  let totalQuantity = 0;

  for (const row of rows) {
    totalBoxes += toSafeNumber(row.totalBoxes);
    totalQuantity += toSafeNumber(row.totalQuantity);
  }

  return {
    totalShipments: rows.length,
    totalBoxes,
    totalQuantity,
  };
}

export function buildAllBoxesSummaryTotals(rows: BoxesTableRow[]): AllBoxesSummaryTotals {
  let shipped = 0;

  for (const row of rows) {
    if (row.status === 'SHIPPED') {
      shipped++;
    }
  }

  return {
    totalBoxes: rows.length,
    notShipped: rows.length - shipped,
    shipped,
  };
}

export function buildShipmentItemsSummaryTotals(rows: ShipmentItemsTableRow[]): ShipmentItemsSummaryTotals {
  let totalQuantity = 0;
  let traderAndGeneralQuantity = 0;
  let customerQuantity = 0;

  for (const row of rows) {
    const qty = toSafeNumber(row.quantity);
    totalQuantity += qty;

    if (row.ownershipType === 'CUSTOMER') {
      customerQuantity += qty;
    } else {
      traderAndGeneralQuantity += qty;
    }
  }

  return { totalQuantity, traderAndGeneralQuantity, customerQuantity };
}