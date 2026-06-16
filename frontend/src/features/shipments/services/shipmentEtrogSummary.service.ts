import type { ShipmentItemRecord } from '../../../services/shipmentItemsApi';

export type PitamStatusKey = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

export const PITAM_STATUS_KEYS: PitamStatusKey[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

export type ShipmentEtrogSummaryRow = {
  key: string;
  label: string;
  counts: Record<PitamStatusKey, number>;
  total: number;
};

export type ShipmentEtrogSummary = {
  pitamStatuses: PitamStatusKey[];
  traderCategoryRows: ShipmentEtrogSummaryRow[];
  customerCategoryRows: ShipmentEtrogSummaryRow[];
  customRow: ShipmentEtrogSummaryRow | null;
  columnTotals: Record<PitamStatusKey, number>;
  grandTotal: number;
};

function emptyCounts(): Record<PitamStatusKey, number> {
  return { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
}

function emptyRow(key: string, label: string): ShipmentEtrogSummaryRow {
  return { key, label, counts: emptyCounts(), total: 0 };
}

function isPitamStatusKey(value: string | null): value is PitamStatusKey {
  return value === 'WITH_PITAM' || value === 'WITHOUT_PITAM' || value === 'MIXED';
}

export function buildShipmentEtrogSummary(
  items: ShipmentItemRecord[],
  customLabel: string,
): ShipmentEtrogSummary {
  const traderCategoryRowsMap = new Map<number, ShipmentEtrogSummaryRow>();
  const customerCategoryRowsMap = new Map<number, ShipmentEtrogSummaryRow>();
  const customRow = emptyRow('custom', customLabel);
  const columnTotals = emptyCounts();
  let grandTotal = 0;

  for (const item of items) {
    let targetRow: ShipmentEtrogSummaryRow;

    if (item.traderCategoryId !== null) {
      if (!traderCategoryRowsMap.has(item.traderCategoryId)) {
        traderCategoryRowsMap.set(
          item.traderCategoryId,
          emptyRow(`trader-category-${item.traderCategoryId}`, item.traderCategory?.name ?? ''),
        );
      }
      targetRow = traderCategoryRowsMap.get(item.traderCategoryId)!;
    } else if (item.customerCategoryId !== null) {
      if (!customerCategoryRowsMap.has(item.customerCategoryId)) {
        customerCategoryRowsMap.set(
          item.customerCategoryId,
          emptyRow(`customer-category-${item.customerCategoryId}`, item.customerCategory?.name ?? ''),
        );
      }
      targetRow = customerCategoryRowsMap.get(item.customerCategoryId)!;
    } else {
      targetRow = customRow;
    }

    if (isPitamStatusKey(item.pitamStatus)) {
      targetRow.counts[item.pitamStatus] += item.quantity;
      columnTotals[item.pitamStatus] += item.quantity;
    }
    targetRow.total += item.quantity;
    grandTotal += item.quantity;
  }

  const traderCategoryRows = Array.from(traderCategoryRowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const customerCategoryRows = Array.from(customerCategoryRowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  return {
    pitamStatuses: PITAM_STATUS_KEYS,
    traderCategoryRows,
    customerCategoryRows,
    customRow: customRow.total > 0 ? customRow : null,
    columnTotals,
    grandTotal,
  };
}
