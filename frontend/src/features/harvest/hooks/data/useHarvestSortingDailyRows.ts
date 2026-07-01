import { useEffect } from 'react';
import { getHarvestsBySeason } from '../../../../services/harvestsApi';
import {
  getClassificationDailySummaryBySeason,
  getClassificationsByHarvest,
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
} from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import { buildSortingCategoryDisplayLabel, sortSortingDailyCategories } from '../../utils/harvestPage.utils';

type UseHarvestSortingDailyRowsParams = {
  isSortingDailyDetailsTab: boolean;
  seasonFilterId: number | null;
  lang: 'he' | 'en';
  sortingDailyLoadErrorMessage: string;
  setSortingDailyRows: (value: ClassificationDailySummaryRow[]) => void;
  setSortingDailyCategories: (value: ClassificationDailySummaryCategory[]) => void;
  setSortingDailyLoadError: (value: string) => void;
  setIsSortingDailyLoading: (value: boolean) => void;
  traderCategories?: TraderCategoryWithShares[];
};

export function useHarvestSortingDailyRows({
  isSortingDailyDetailsTab,
  seasonFilterId,
  lang,
  sortingDailyLoadErrorMessage,
  setSortingDailyRows,
  setSortingDailyCategories,
  setSortingDailyLoadError,
  setIsSortingDailyLoading,
  traderCategories = [],
}: UseHarvestSortingDailyRowsParams): void {
  const traderCategoryOrder = new Map<string, number>();
  for (const category of traderCategories) {
    traderCategoryOrder.set(category.name, category.orderIndex);
  }
  useEffect(() => {
    if (!isSortingDailyDetailsTab) {
      setSortingDailyRows([]);
      setSortingDailyCategories([]);
      setSortingDailyLoadError('');
      setIsSortingDailyLoading(false);
      return;
    }

    if (!seasonFilterId) {
      setSortingDailyRows([]);
      setSortingDailyCategories([]);
      setSortingDailyLoadError('');
      return;
    }

    let isMounted = true;

    const loadSortingDailyRows = async () => {
      setIsSortingDailyLoading(true);
      setSortingDailyLoadError('');

      const buildFallbackFromHarvestRows = async () => {
        const harvests = await getHarvestsBySeason(seasonFilterId);
        const groupedRows = new Map<number, ClassificationDailySummaryRow>();
        const groupedCategories = new Map<string, ClassificationDailySummaryCategory>();

        const classificationBuckets = await Promise.all(
          harvests.map(async (harvest) => {
            const rows = await getClassificationsByHarvest(harvest.id);
            return { harvest, rows };
          }),
        );

        for (const bucket of classificationBuckets) {
          groupedRows.set(bucket.harvest.id, {
            harvestId: bucket.harvest.id,
            fieldId: bucket.harvest.fieldId,
            fieldName: bucket.harvest.field?.name ?? '-',
            dateGregorian: bucket.harvest.dateGregorian,
            dateHebrew: bucket.harvest.dateHebrew,
            totalSorted: 0,
            categoryTotals: {},
          });

          const row = groupedRows.get(bucket.harvest.id)!;

          for (const sorting of bucket.rows) {
            const quantity = Number(sorting.quantity) || 0;
            if (quantity <= 0) {
              continue;
            }

            const traderName = sorting.trader?.name?.trim();
            const customerName = sorting.customer?.customerName?.trim();
            const ownerType: ClassificationDailySummaryCategory['ownerType'] = traderName
              ? 'TRADER'
              : customerName
                ? 'CUSTOMER'
                : 'GENERAL';
            const ownerName = traderName || customerName || null;
            const ownerKey = traderName
              ? `trader:${traderName}`
              : customerName
                ? `customer:${customerName}`
                : 'general';

            const customerCategoryName = sorting.customerCategory?.name?.trim();
            const traderCategoryName = sorting.traderCategory?.name?.trim();
            const categoryLabel = customerCategoryName || traderCategoryName;
            const categoryTypeKey = customerCategoryName
              ? `customer:${customerCategoryName}`
              : traderCategoryName
                ? `trader:${traderCategoryName}`
                : null;

            if (!categoryTypeKey || !categoryLabel) {
              continue;
            }

            const categoryKey = `${ownerKey}|${categoryTypeKey}`;

            row.categoryTotals[categoryKey] = (row.categoryTotals[categoryKey] ?? 0) + quantity;
            row.totalSorted += quantity;

            const existingCategory = groupedCategories.get(categoryKey);
            if (!existingCategory) {
              groupedCategories.set(categoryKey, {
                key: categoryKey,
                label: categoryLabel,
                ownerType,
                ownerName,
                categoryName: categoryLabel,
                total: quantity,
              });
            } else {
              existingCategory.total += quantity;
            }
          }
        }

        const categories = Array.from(groupedCategories.values())
          .filter((category) => category.total > 0)
          .sort((left, right) => {
            if (right.total !== left.total) {
              return right.total - left.total;
            }

            return buildSortingCategoryDisplayLabel(left, lang).localeCompare(
              buildSortingCategoryDisplayLabel(right, lang),
              'he',
              {
                sensitivity: 'base',
                numeric: true,
              },
            );
          });

        const rows = Array.from(groupedRows.values())
          .filter((row) => row.totalSorted > 0)
          .map((row) => {
            const categoryTotals: Record<string, number> = {};

            for (const category of categories) {
              const value = row.categoryTotals[category.key] ?? 0;
              if (value > 0) {
                categoryTotals[category.key] = value;
              }
            }

            return {
              ...row,
              categoryTotals,
            };
          })
          .sort((left, right) => {
            const leftTime = Date.parse(left.dateGregorian);
            const rightTime = Date.parse(right.dateGregorian);
            if (rightTime !== leftTime) {
              return rightTime - leftTime;
            }

            if (left.fieldName !== right.fieldName) {
              return left.fieldName.localeCompare(right.fieldName, 'he', {
                sensitivity: 'base',
                numeric: true,
              });
            }

            return right.harvestId - left.harvestId;
          });

        return {
          rows,
          categories: sortSortingDailyCategories(categories, traderCategoryOrder),
        };
      };

      try {
        const payload = await getClassificationDailySummaryBySeason(seasonFilterId);
        if (!isMounted) {
          return;
        }

        setSortingDailyRows(payload.rows);
        setSortingDailyCategories(sortSortingDailyCategories(payload.categories, traderCategoryOrder));
      } catch {
        try {
          const fallbackPayload = await buildFallbackFromHarvestRows();

          if (!isMounted) {
            return;
          }

          setSortingDailyRows(fallbackPayload.rows);
          setSortingDailyCategories(fallbackPayload.categories);
          setSortingDailyLoadError('');
        } catch {
          if (!isMounted) {
            return;
          }

          setSortingDailyRows([]);
          setSortingDailyCategories([]);
          setSortingDailyLoadError(sortingDailyLoadErrorMessage);
        }
      } finally {
        if (isMounted) {
          setIsSortingDailyLoading(false);
        }
      }
    };

    void loadSortingDailyRows();

    return () => {
      isMounted = false;
    };
  }, [
    isSortingDailyDetailsTab,
    lang,
    seasonFilterId,
    setIsSortingDailyLoading,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingDailyRows,
    sortingDailyLoadErrorMessage,
    traderCategories,
  ]);
}



