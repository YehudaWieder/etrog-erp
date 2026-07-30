import { useCallback, useMemo } from 'react';
import {
  getClassificationDailySummaryBySeason,
  getClassificationsBySeason,
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
  type ClassificationListRecord,
} from '../../../../services/classificationsApi';
import { getHarvestFieldTotalsBySeason, getHarvestsBySeason, type HarvestRecord } from '../../../../services/harvestsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFieldReportRow } from '../../harvestPage.types';
import { sortSortingDailyCategories } from '../../utils/harvestPage.utils';

type UseRefreshHarvestWorkspaceDataParams = {
  seasonFilterId: number | null;
  setHarvestRows: (rows: HarvestRecord[]) => void;
  setFieldReportRows: (rows: HarvestFieldReportRow[]) => void;
  setSortingDailyRows: (rows: ClassificationDailySummaryRow[]) => void;
  setSortingDailyCategories: (rows: ClassificationDailySummaryCategory[]) => void;
  setSortingDailyLoadError: (value: string) => void;
  setSortingListRows?: (rows: ClassificationListRecord[]) => void;
  traderCategories?: TraderCategoryWithShares[];
};

// Reloads every season-scoped harvest view (field-report totals, daily sorting summary, and — when
// mounted — the flat sorting list) after a harvest and/or its classifications change, so all tabs
// stay in sync without a full page reload.
export function useRefreshHarvestWorkspaceData({
  seasonFilterId,
  setHarvestRows,
  setFieldReportRows,
  setSortingDailyRows,
  setSortingDailyCategories,
  setSortingDailyLoadError,
  setSortingListRows,
  traderCategories = [],
}: UseRefreshHarvestWorkspaceDataParams) {
  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  const refreshHarvestWorkspaceData = useCallback(async (): Promise<HarvestRecord[]> => {
    if (!seasonFilterId) {
      return [];
    }

    const [records, fieldTotals, sortingSummary, sortingListRows] = await Promise.all([
      getHarvestsBySeason(seasonFilterId),
      getHarvestFieldTotalsBySeason(seasonFilterId),
      getClassificationDailySummaryBySeason(seasonFilterId),
      setSortingListRows ? getClassificationsBySeason(seasonFilterId) : Promise.resolve(null),
    ]);

    setHarvestRows(records);
    if (sortingListRows) {
      setSortingListRows?.(sortingListRows);
    }
    setFieldReportRows(
      fieldTotals.map((row) => ({
        id: row.fieldId,
        fieldName: row.fieldName,
        recordCount: row.recordCount,
        badPickCount: row.badPickCount,
        totalHarvested: row.totalHarvested,
        totalRejected: row.totalRejected,
        totalAfterRejected: row.totalAfterRejected,
        classifiedTotal: row.classifiedTotal,
        rejectionRate: row.rejectionRate,
        ownerHarvested: row.ownerHarvested,
        ownerRejected: row.ownerRejected,
        ownerAfterRejected: row.ownerAfterRejected,
        ownerRejectionRate: row.ownerRejectionRate,
        differenceHarvested: row.differenceHarvested,
        differenceRejected: row.differenceRejected,
        differenceAfterRejected: row.differenceAfterRejected,
        differenceRejectionRate: row.differenceRejectionRate,
        hasOwnerOverrides: row.hasOwnerOverrides,
        isPartialClassification: row.isPartialClassification,
        totalHarvestedExcludingBadPicks: row.totalHarvestedExcludingBadPicks,
        totalRejectedExcludingBadPicks: row.totalRejectedExcludingBadPicks,
        ownerHarvestedExcludingBadPicks: row.ownerHarvestedExcludingBadPicks,
        ownerRejectedExcludingBadPicks: row.ownerRejectedExcludingBadPicks,
      })),
    );
    setSortingDailyRows(sortingSummary.rows);
    setSortingDailyCategories(sortSortingDailyCategories(sortingSummary.categories, traderCategoryOrder));
    setSortingDailyLoadError('');

    return records;
  }, [
    seasonFilterId,
    setFieldReportRows,
    setHarvestRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingDailyRows,
    setSortingListRows,
    traderCategoryOrder,
  ]);

  return { refreshHarvestWorkspaceData };
}
