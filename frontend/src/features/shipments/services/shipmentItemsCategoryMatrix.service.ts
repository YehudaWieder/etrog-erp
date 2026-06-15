import type { ShipmentItemsTableRow } from '../shipments.types';

export type CategoryMatrixData = {
  categoryName: string;
  ownerships: string[];
  shipmentNumbers: number[];
  values: Record<string, Record<number, number>>;
  rowTotals: Record<string, number>;
  columnTotals: Record<number, number>;
  grandTotal: number;
};

export function buildShipmentItemsCategoryMatrices(rows: ShipmentItemsTableRow[]): CategoryMatrixData[] {
  const categoryMap = new Map<string, ShipmentItemsTableRow[]>();

  for (const row of rows) {
    const cat = row.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(row);
  }

  const result: CategoryMatrixData[] = [];

  for (const [categoryName, categoryRows] of categoryMap.entries()) {
    const ownershipSet = new Set<string>();
    const shipmentSet = new Set<number>();

    for (const row of categoryRows) {
      ownershipSet.add(row.ownership);
      shipmentSet.add(row.shipmentNumber);
    }

    const ownerships = Array.from(ownershipSet).sort((a, b) => a.localeCompare(b));
    const shipmentNumbers = Array.from(shipmentSet).sort((a, b) => a - b);

    const values: Record<string, Record<number, number>> = {};
    const rowTotals: Record<string, number> = {};
    const columnTotals: Record<number, number> = {};
    let grandTotal = 0;

    for (const ownership of ownerships) {
      values[ownership] = {};
      rowTotals[ownership] = 0;
    }
    for (const shipmentNumber of shipmentNumbers) {
      columnTotals[shipmentNumber] = 0;
    }

    for (const row of categoryRows) {
      const prev = values[row.ownership][row.shipmentNumber] ?? 0;
      values[row.ownership][row.shipmentNumber] = prev + row.quantity;
      rowTotals[row.ownership] = (rowTotals[row.ownership] ?? 0) + row.quantity;
      columnTotals[row.shipmentNumber] = (columnTotals[row.shipmentNumber] ?? 0) + row.quantity;
      grandTotal += row.quantity;
    }

    result.push({ categoryName, ownerships, shipmentNumbers, values, rowTotals, columnTotals, grandTotal });
  }

  return result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function buildShipmentItemsOwnershipMatrix(rows: ShipmentItemsTableRow[]): CategoryMatrixData {
  const ownershipSet = new Set<string>();
  const shipmentSet = new Set<number>();

  for (const row of rows) {
    ownershipSet.add(row.ownership);
    shipmentSet.add(row.shipmentNumber);
  }

  const ownerships = Array.from(ownershipSet).sort((a, b) => a.localeCompare(b));
  const shipmentNumbers = Array.from(shipmentSet).sort((a, b) => a - b);

  const values: Record<string, Record<number, number>> = {};
  const rowTotals: Record<string, number> = {};
  const columnTotals: Record<number, number> = {};
  let grandTotal = 0;

  for (const ownership of ownerships) {
    values[ownership] = {};
    rowTotals[ownership] = 0;
  }
  for (const num of shipmentNumbers) columnTotals[num] = 0;

  for (const row of rows) {
    values[row.ownership][row.shipmentNumber] = (values[row.ownership][row.shipmentNumber] ?? 0) + row.quantity;
    rowTotals[row.ownership] = (rowTotals[row.ownership] ?? 0) + row.quantity;
    columnTotals[row.shipmentNumber] = (columnTotals[row.shipmentNumber] ?? 0) + row.quantity;
    grandTotal += row.quantity;
  }

  return { categoryName: '', ownerships, shipmentNumbers, values, rowTotals, columnTotals, grandTotal };
}
