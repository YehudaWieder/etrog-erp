import type {
  ClassificationDailySummaryCategory,
  ClassificationDailySummaryRow,
} from '../../../services/classificationsApi';
import { resolveSortingCategoryOwnerType } from '../utils/harvestPage.utils';

export type HarvestSortingDailySummaryTotals = {
  totalSorted: number;
  traderTotal: number;
  customerTotal: number;
};

export function buildHarvestSortingDailySummaryTotals(params: {
  rows: ClassificationDailySummaryRow[];
  categories: ClassificationDailySummaryCategory[];
}): HarvestSortingDailySummaryTotals {
  const { rows, categories } = params;
  let totalSorted = 0;
  let traderTotal = 0;
  let customerTotal = 0;

  for (const row of rows) {
    totalSorted += row.totalSorted;

    for (const category of categories) {
      const value = row.categoryTotals[category.key] ?? 0;
      if (value <= 0) {
        continue;
      }

      const ownerType = resolveSortingCategoryOwnerType(category);
      if (ownerType === 'TRADER') {
        traderTotal += value;
      } else if (ownerType === 'CUSTOMER') {
        customerTotal += value;
      }
    }
  }

  return {
    totalSorted,
    traderTotal,
    customerTotal,
  };
}