import type { ShipmentItemsTableRow } from '../shipments.types';

export type ShipmentSummaryBucket = {
  quantities: Record<number, number>;
  total: number;
};

export type ShipmentSummaryCategoryRow = {
  categoryName: string;
  bucket: ShipmentSummaryBucket;
};

export type ShipmentItemsSummaryMatrix = {
  shipmentNumbers: number[];
  generalCategories: ShipmentSummaryCategoryRow[];
  privateSelection: ShipmentSummaryBucket;
  customers: ShipmentSummaryBucket;
  columnTotals: Record<number, number>;
  grandTotal: number;
};

function emptyBucket(shipmentNumbers: number[]): ShipmentSummaryBucket {
  const quantities: Record<number, number> = {};
  for (const num of shipmentNumbers) quantities[num] = 0;
  return { quantities, total: 0 };
}

export function buildShipmentItemsSummaryMatrix(rows: ShipmentItemsTableRow[]): ShipmentItemsSummaryMatrix {
  const shipmentSet = new Set<number>();
  for (const row of rows) shipmentSet.add(row.shipmentNumber);
  const shipmentNumbers = Array.from(shipmentSet).sort((a, b) => a - b);

  const generalMap = new Map<string, ShipmentSummaryBucket>();
  const privateSelection = emptyBucket(shipmentNumbers);
  const customers = emptyBucket(shipmentNumbers);
  const columnTotals: Record<number, number> = {};
  for (const num of shipmentNumbers) columnTotals[num] = 0;
  let grandTotal = 0;

  for (const row of rows) {
    const qty = row.quantity;
    const num = row.shipmentNumber;

    if (row.ownershipType === 'CUSTOMER') {
      customers.quantities[num] = (customers.quantities[num] ?? 0) + qty;
      customers.total += qty;
    } else if (row.isPrivateSelection) {
      privateSelection.quantities[num] = (privateSelection.quantities[num] ?? 0) + qty;
      privateSelection.total += qty;
    } else {
      if (!generalMap.has(row.category)) {
        generalMap.set(row.category, emptyBucket(shipmentNumbers));
      }
      const bucket = generalMap.get(row.category)!;
      bucket.quantities[num] = (bucket.quantities[num] ?? 0) + qty;
      bucket.total += qty;
    }

    columnTotals[num] = (columnTotals[num] ?? 0) + qty;
    grandTotal += qty;
  }

  const generalCategories: ShipmentSummaryCategoryRow[] = Array.from(generalMap.entries())
    .map(([categoryName, bucket]) => ({ categoryName, bucket }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return { shipmentNumbers, generalCategories, privateSelection, customers, columnTotals, grandTotal };
}
