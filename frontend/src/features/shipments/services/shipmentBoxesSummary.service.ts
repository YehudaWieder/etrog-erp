import type { BoxRecord } from '../../../services/boxesApi';

export type BoxTypeKey = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';

export const BOX_TYPE_KEYS: BoxTypeKey[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];

export type ShipmentBoxesSummaryRow = {
  key: string;
  label: string;
  counts: Record<BoxTypeKey, number>;
  total: number;
  etrogTotal: number;
};

export type ShipmentBoxesSummary = {
  boxTypes: BoxTypeKey[];
  generalRow: ShipmentBoxesSummaryRow;
  traderRows: ShipmentBoxesSummaryRow[];
  customerRows: ShipmentBoxesSummaryRow[];
  customRow: ShipmentBoxesSummaryRow | null;
  columnTotals: Record<BoxTypeKey, number>;
  grandTotal: number;
  grandEtrogTotal: number;
};

function emptyCounts(): Record<BoxTypeKey, number> {
  return { SMALL: 0, MEDIUM: 0, LARGE: 0, CUSTOM: 0 };
}

function emptyRow(key: string, label: string): ShipmentBoxesSummaryRow {
  return { key, label, counts: emptyCounts(), total: 0, etrogTotal: 0 };
}

export function buildShipmentBoxesSummary(
  boxes: BoxRecord[],
  generalLabel: string,
  customLabel: string,
): ShipmentBoxesSummary {
  const generalRow = emptyRow('general', generalLabel);
  const customRow = emptyRow('custom', customLabel);
  const traderRowsMap = new Map<number, ShipmentBoxesSummaryRow>();
  const customerRowsMap = new Map<number, ShipmentBoxesSummaryRow>();
  const columnTotals = emptyCounts();
  let grandTotal = 0;
  let grandEtrogTotal = 0;

  for (const box of boxes) {
    const boxType = box.boxType as BoxTypeKey;
    let targetRow: ShipmentBoxesSummaryRow;

    if (box.ownershipType === 'TRADER' && box.traderId !== null) {
      if (!traderRowsMap.has(box.traderId)) {
        traderRowsMap.set(box.traderId, emptyRow(`trader-${box.traderId}`, box.trader?.name ?? ''));
      }
      targetRow = traderRowsMap.get(box.traderId)!;
    } else if (box.ownershipType === 'CUSTOMER' && box.customerId !== null) {
      if (!customerRowsMap.has(box.customerId)) {
        customerRowsMap.set(box.customerId, emptyRow(`customer-${box.customerId}`, box.customer?.customerName ?? ''));
      }
      targetRow = customerRowsMap.get(box.customerId)!;
    } else if (box.ownershipType === 'CUSTOM') {
      targetRow = customRow;
    } else {
      targetRow = generalRow;
    }

    targetRow.counts[boxType] = (targetRow.counts[boxType] ?? 0) + 1;
    targetRow.total += 1;
    targetRow.etrogTotal += box.totalQuantity;
    columnTotals[boxType] = (columnTotals[boxType] ?? 0) + 1;
    grandTotal += 1;
    grandEtrogTotal += box.totalQuantity;
  }

  const traderRows = Array.from(traderRowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const customerRows = Array.from(customerRowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const boxTypes = BOX_TYPE_KEYS.filter((boxType) => boxType !== 'CUSTOM' || columnTotals.CUSTOM > 0);

  return {
    boxTypes,
    generalRow,
    traderRows,
    customerRows,
    customRow: customRow.total > 0 ? customRow : null,
    columnTotals,
    grandTotal,
    grandEtrogTotal,
  };
}
