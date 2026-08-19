import type { IsraelClassificationSeasonRecord } from '../../../../services/israelClassificationsApi';

export type IsraelSortingDailyRow = {
  harvestId: number;
  fieldId: number;
  fieldName: string;
  dateGregorian: string;
  dateHebrew: string;
  totalSorted: number;
  categoryTotals: Record<string, number>;
};

export function buildIsraelSortingDailyRows(
  records: IsraelClassificationSeasonRecord[],
  categoryOrder: Map<string, number> | null,
  allCategoryNames: string[] = [],
): { rows: IsraelSortingDailyRow[]; categories: string[] } {
  const rowsByHarvest = new Map<number, IsraelSortingDailyRow>();
  const categoryNames = new Set<string>(allCategoryNames);

  for (const record of records) {
    const harvest = record.harvest;
    if (!harvest) continue;
    const qty = record.quantity || 0;
    const categoryName = record.category?.name?.trim();

    let row = rowsByHarvest.get(record.harvestId);
    if (!row) {
      row = {
        harvestId: record.harvestId,
        fieldId: harvest.fieldId,
        fieldName: harvest.field?.name ?? '',
        dateGregorian: harvest.dateGregorian,
        dateHebrew: harvest.dateHebrew ?? '',
        totalSorted: 0,
        categoryTotals: {},
      };
      rowsByHarvest.set(record.harvestId, row);
    }

    row.totalSorted += qty;
    if (categoryName) {
      row.categoryTotals[categoryName] = (row.categoryTotals[categoryName] ?? 0) + qty;
      categoryNames.add(categoryName);
    }
  }

  const categories = [...categoryNames].sort((a, b) => {
    if (categoryOrder) {
      const ai = categoryOrder.get(a);
      const bi = categoryOrder.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
    }
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  });

  const rows = [...rowsByHarvest.values()].sort(
    (a, b) => Date.parse(b.dateGregorian) - Date.parse(a.dateGregorian),
  );

  return { rows, categories };
}
