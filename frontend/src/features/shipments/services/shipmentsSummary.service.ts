import type { BoxesTableRow, ShipmentItemsTableRow, ShipmentRecord } from '../shipments.types';

export type AllShipmentsSummaryTotals = {
  totalShipments: number;
  totalBoxes: number;
  totalQuantity: number;
};

export type AllBoxesSummaryTotals = {
  totalBoxes: number;
  totalQuantity: number;
  totalShipments: number;
};

export type ShipmentItemsSummaryTotals = {
  totalItems: number;
  totalQuantity: number;
  totalBoxes: number;
};

export function buildAllShipmentsSummaryTotals(rows: ShipmentRecord[]): AllShipmentsSummaryTotals {
  let totalBoxes = 0;
  let totalQuantity = 0;

  for (const row of rows) {
    totalBoxes += row.boxCount;
    totalQuantity += row.totalQuantity;
  }

  return {
    totalShipments: rows.length,
    totalBoxes,
    totalQuantity,
  };
}

export function buildAllBoxesSummaryTotals(rows: BoxesTableRow[]): AllBoxesSummaryTotals {
  let totalQuantity = 0;
  const shipmentIds = new Set<number>();

  for (const row of rows) {
    totalQuantity += row.totalQuantity;
    shipmentIds.add(row.shipmentNumber);
  }

  return {
    totalBoxes: rows.length,
    totalQuantity,
    totalShipments: shipmentIds.size,
  };
}

export function buildShipmentItemsSummaryTotals(rows: ShipmentItemsTableRow[]): ShipmentItemsSummaryTotals {
  let totalQuantity = 0;
  const boxNumbers = new Set<number>();

  for (const row of rows) {
    totalQuantity += row.quantity;
    boxNumbers.add(row.boxNumber);
  }

  return {
    totalItems: rows.length,
    totalQuantity,
    totalBoxes: boxNumbers.size,
  };
}