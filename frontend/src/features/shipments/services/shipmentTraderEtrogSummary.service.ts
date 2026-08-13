import type { ShipmentItemRecord } from '../../../services/shipmentItemsApi';

export type ShipmentTraderEtrogSummaryRow = {
  key: string;
  label: string;
  counts: Record<string, number>;
  total: number;
};

export type ShipmentTraderEtrogSummary = {
  categories: string[];
  rows: ShipmentTraderEtrogSummaryRow[];
  columnTotals: Record<string, number>;
  grandTotal: number;
};

export function buildShipmentTraderEtrogSummary(
  items: ShipmentItemRecord[],
  categoryOrderByName?: Map<string, number> | null,
): ShipmentTraderEtrogSummary {
  const rowsMap = new Map<number, { key: string; label: string; counts: Map<string, number>; total: number }>();
  const categoriesSet = new Set<string>();
  const columnTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const item of items) {
    if (item.ownershipType !== 'TRADER' || item.traderId === null) {
      continue;
    }

    const categoryName = item.traderCategory?.name ?? '';
    categoriesSet.add(categoryName);

    if (!rowsMap.has(item.traderId)) {
      rowsMap.set(item.traderId, {
        key: `trader-${item.traderId}`,
        label: item.trader?.name ?? '',
        counts: new Map(),
        total: 0,
      });
    }
    const row = rowsMap.get(item.traderId)!;
    row.counts.set(categoryName, (row.counts.get(categoryName) ?? 0) + item.quantity);
    row.total += item.quantity;
    columnTotals.set(categoryName, (columnTotals.get(categoryName) ?? 0) + item.quantity);
    grandTotal += item.quantity;
  }

  const categories = Array.from(categoriesSet).sort((a, b) => {
    if (categoryOrderByName) {
      const orderA = categoryOrderByName.get(a);
      const orderB = categoryOrderByName.get(b);
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;
    }
    return a.localeCompare(b);
  });

  const rows = Array.from(rowsMap.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((row) => ({
      key: row.key,
      label: row.label,
      counts: Object.fromEntries(categories.map((category) => [category, row.counts.get(category) ?? 0])),
      total: row.total,
    }));

  return {
    categories,
    rows,
    columnTotals: Object.fromEntries(categories.map((category) => [category, columnTotals.get(category) ?? 0])),
    grandTotal,
  };
}
