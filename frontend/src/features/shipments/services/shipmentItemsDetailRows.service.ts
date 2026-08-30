import type { BoxRecord } from '../../../services/boxesApi';
import type { GeneralSourceBreakdownEntry, ShipmentItemRecord } from '../../../services/shipmentItemsApi';
import type { ShipmentsTableLabels } from '../shipments.types';

export type ShipmentItemDetailRow = {
  id: number;
  shipmentNumber?: number;
  boxNumber: number;
  ownership: string;
  stockSource: string;
  category: string;
  grade: string;
  pitamStatus: string;
  quantity: number;
  notes: string;
  generalSourceBreakdown: GeneralSourceBreakdownEntry[] | null;
};

export function buildShipmentItemsDetailRows(
  items: ShipmentItemRecord[],
  boxes: BoxRecord[],
  labels: ShipmentsTableLabels['detailsItemsTable'],
): ShipmentItemDetailRow[] {
  const boxNumberById = new Map<number, number>();
  for (const box of boxes) {
    boxNumberById.set(box.id, box.boxNumber);
  }

  const rows = items.map((item) => {
    const ownership = item.ownershipType === 'TRADER'
      ? item.trader?.name || labels.ownershipLabels.TRADER
      : item.ownershipType === 'CUSTOMER'
        ? item.customer?.customerName || labels.ownershipLabels.CUSTOMER
        : labels.ownershipLabels[item.ownershipType];

    const category = item.traderCategory?.name
      ?? item.customerCategory?.name
      ?? item.customLabel
      ?? labels.uncategorized;

    const grade = item.customGrade ?? item.grade ?? item.customerCategory?.grade ?? labels.noGrade;

    const stockSource = item.ownershipType === 'TRADER'
      ? (item.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
      : '—';

    const pitamStatus = item.pitamStatus
      ? (labels.pitamStatusLabels[item.pitamStatus as keyof typeof labels.pitamStatusLabels] ?? item.pitamStatus)
      : labels.noPitamStatus;

    return {
      id: item.id,
      boxNumber: boxNumberById.get(item.boxId) ?? 0,
      ownership,
      stockSource,
      category,
      grade,
      pitamStatus,
      quantity: item.quantity,
      notes: item.notes?.trim() ?? '',
      generalSourceBreakdown: item.generalSourceBreakdown ?? null,
    };
  });

  return rows.sort((a, b) => a.boxNumber - b.boxNumber);
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

export function buildBoxItemsDetailRows(
  items: ShipmentItemRecord[],
  boxNumber: number,
  labels: ShipmentsTableLabels['detailsItemsTable'],
  categoryOrderByName?: Map<string, number> | null,
  shipmentNumber?: number,
): ShipmentItemDetailRow[] {
  const rows = items.map((item) => {
    const ownership = item.ownershipType === 'TRADER'
      ? item.trader?.name || labels.ownershipLabels.TRADER
      : item.ownershipType === 'CUSTOMER'
        ? item.customer?.customerName || labels.ownershipLabels.CUSTOMER
        : labels.ownershipLabels[item.ownershipType];

    const category = item.traderCategory?.name
      ?? item.customerCategory?.name
      ?? item.customLabel
      ?? labels.uncategorized;

    const grade = item.customGrade ?? item.grade ?? item.customerCategory?.grade ?? labels.noGrade;

    const stockSource = item.ownershipType === 'TRADER'
      ? (item.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
      : '—';

    const pitamStatus = item.pitamStatus
      ? (labels.pitamStatusLabels[item.pitamStatus as keyof typeof labels.pitamStatusLabels] ?? item.pitamStatus)
      : labels.noPitamStatus;

    return {
      id: item.id,
      shipmentNumber,
      boxNumber,
      ownership,
      stockSource,
      category,
      grade,
      pitamStatus,
      quantity: item.quantity,
      notes: item.notes?.trim() ?? '',
      generalSourceBreakdown: item.generalSourceBreakdown ?? null,
    };
  });

  return rows.sort((a, b) => {
    if ((a.shipmentNumber ?? 0) !== (b.shipmentNumber ?? 0)) return (a.shipmentNumber ?? 0) - (b.shipmentNumber ?? 0);
    if (a.boxNumber !== b.boxNumber) return a.boxNumber - b.boxNumber;
    if (a.ownership !== b.ownership) return a.ownership.localeCompare(b.ownership);
    if (a.stockSource !== b.stockSource) return a.stockSource.localeCompare(b.stockSource);
    const categoryCompare = compareCategoryNames(a.category, b.category, categoryOrderByName) || a.grade.localeCompare(b.grade);
    if (categoryCompare !== 0) return categoryCompare;
    return a.pitamStatus.localeCompare(b.pitamStatus);
  });
}

// For each row: the number of rows to merge into it (rowSpan) if it starts a run of
// consecutive rows sharing the same key, or 0 if it's part of the previous row's merged cell.
export function computeMergedRowSpans(rows: ShipmentItemDetailRow[], getKey: (row: ShipmentItemDetailRow) => string): number[] {
  const spans = new Array(rows.length).fill(0);
  let groupStart = 0;

  while (groupStart < rows.length) {
    let groupEnd = groupStart;
    while (groupEnd + 1 < rows.length && getKey(rows[groupEnd + 1]) === getKey(rows[groupStart])) {
      groupEnd++;
    }

    spans[groupStart] = groupEnd - groupStart + 1;
    groupStart = groupEnd + 1;
  }

  return spans;
}

export type ShipmentItemDetailRowSpans = {
  shipmentNumber: number[];
  boxNumber: number[];
  ownership: number[];
  stockSource: number[];
  category: number[];
};

export function computeShipmentItemDetailRowSpans(rows: ShipmentItemDetailRow[]): ShipmentItemDetailRowSpans {
  return {
    shipmentNumber: computeMergedRowSpans(rows, (row) => String(row.shipmentNumber ?? '')),
    boxNumber: computeMergedRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}`),
    ownership: computeMergedRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}`),
    stockSource: computeMergedRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}|${row.stockSource}`),
    category: computeMergedRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}|${row.stockSource}|${row.category}`),
  };
}
