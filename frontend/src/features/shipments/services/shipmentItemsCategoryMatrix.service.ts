import type { ShipmentItemsTableRow } from '../shipments.types';

export type ShipmentBreakdownMatrix = {
  shipmentNumber: number;
  ownershipNames: string[];
  generalCategories: string[];
  columnKeys: string[];
  values: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  columnTotals: Record<string, number>;
  grandTotal: number;
};

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

function compareCategoryNames(a: string, b: string, categoryOrderByName?: Map<string, number> | null): number {
  if (categoryOrderByName) {
    const ai = categoryOrderByName.get(a);
    const bi = categoryOrderByName.get(b);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
  }
  return a.localeCompare(b);
}

export function buildShipmentItemsPerShipmentMatrices(
  rows: ShipmentItemsTableRow[],
  categoryOrderByName?: Map<string, number> | null,
): ShipmentBreakdownMatrix[] {
  const shipmentMap = new Map<number, ShipmentItemsTableRow[]>();
  for (const row of rows) {
    if (!shipmentMap.has(row.shipmentNumber)) shipmentMap.set(row.shipmentNumber, []);
    shipmentMap.get(row.shipmentNumber)!.push(row);
  }

  const result: ShipmentBreakdownMatrix[] = [];

  for (const [shipmentNumber, shipmentRows] of shipmentMap.entries()) {
    const categorySet = new Set<string>();
    const ownershipTypeMap = new Map<string, string>();

    for (const row of shipmentRows) {
      ownershipTypeMap.set(row.ownership, row.ownershipType);
      if (row.ownershipType !== 'CUSTOMER' && !row.isPrivateSelection) {
        categorySet.add(row.category);
      }
    }

    const ownershipTypePriority = (type: string) =>
      type === 'TRADER' ? 0 : type === 'CUSTOMER' ? 1 : 2;

    const generalCategories = Array.from(categorySet).sort((a, b) => compareCategoryNames(a, b, categoryOrderByName));
    const ownershipNames = Array.from(ownershipTypeMap.keys()).sort((a, b) => {
      const pa = ownershipTypePriority(ownershipTypeMap.get(a) ?? '');
      const pb = ownershipTypePriority(ownershipTypeMap.get(b) ?? '');
      return pa !== pb ? pa - pb : a.localeCompare(b);
    });

    const values: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const columnTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const o of ownershipNames) { values[o] = {}; rowTotals[o] = 0; }
    for (const k of [...generalCategories, 'privateSelection', 'customers']) columnTotals[k] = 0;

    for (const row of shipmentRows) {
      const qty = row.quantity;
      const o = row.ownership;
      let colKey: string;

      if (row.ownershipType === 'CUSTOMER') {
        colKey = 'customers';
      } else if (row.isPrivateSelection) {
        colKey = 'privateSelection';
      } else {
        colKey = row.category;
      }

      values[o][colKey] = (values[o][colKey] ?? 0) + qty;
      rowTotals[o] = (rowTotals[o] ?? 0) + qty;
      columnTotals[colKey] = (columnTotals[colKey] ?? 0) + qty;
      grandTotal += qty;
    }

    const columnKeys = [...generalCategories, 'privateSelection', 'customers']
      .filter((k) => (columnTotals[k] ?? 0) > 0);

    result.push({ shipmentNumber, ownershipNames, generalCategories, columnKeys, values, rowTotals, columnTotals, grandTotal });
  }

  return result.sort((a, b) => a.shipmentNumber - b.shipmentNumber);
}
