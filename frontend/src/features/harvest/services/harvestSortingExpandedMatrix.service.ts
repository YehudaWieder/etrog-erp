import {
  getClassificationsByHarvest,
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
  type ClassificationRecord,
} from '../../../services/classificationsApi';
import { getDefaultTraderCategories } from '../../../services/defaultTraderCategoriesApi';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import type { SortingAssignmentFilter } from '../harvestPage.types';
import { buildSortingCategoryDisplayLabel, matchesSortingAssignmentSelection } from '../utils/harvestPage.utils';

export type SortingExpandedMatrixData = {
  fixedHeaders: string[];
  groups: Array<{
    categoryLabel: string;
    total: number;
    pitamGroups: Array<{
      key: string;
      label: string;
      grades: string[];
    }>;
  }>;
  rows: Array<{
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
    values: Record<string, number>;
  }>;
};

type BuildSortingDailyExpandedMatrixDataParams = {
  lang: 'he' | 'en';
  seasonFilterId: number | null;
  sortingAssignmentFilter: SortingAssignmentFilter;
  filteredSortingDailyCategories: ClassificationDailySummaryCategory[];
  rowsSource: ClassificationDailySummaryRow[];
  traderNameById: Map<string, string>;
  customerNameById: Map<string, string>;
  formatGregorianDate: (value: string) => string;
  fixedHeaders: {
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
  };
  noneLabel: string;
};

export async function buildSortingDailyExpandedMatrixData({
  lang,
  seasonFilterId,
  sortingAssignmentFilter,
  filteredSortingDailyCategories,
  rowsSource,
  traderNameById,
  customerNameById,
  formatGregorianDate,
  fixedHeaders,
  noneLabel,
}: BuildSortingDailyExpandedMatrixDataParams): Promise<SortingExpandedMatrixData> {
  const fixedGrades = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
  const pitamGroups = [
    { key: 'WITH_PITAM', label: lang === 'he' ? 'פיטם' : 'With pitam' },
    { key: 'WITHOUT_PITAM', label: lang === 'he' ? 'בל"פ' : 'Without pitam' },
    { key: 'MIXED', label: lang === 'he' ? 'מעורב' : 'Mixed' },
  ] as const;

  const normalizePitamGroup = (pitamStatus?: string | null) => {
    if (!pitamStatus) {
      return 'MIXED';
    }

    const normalized = pitamStatus.replace(/\s+/g, '_').toUpperCase();
    if (normalized === 'WITH_PITAM') {
      return 'WITH_PITAM';
    }

    if (normalized === 'WITHOUT_PITAM') {
      return 'WITHOUT_PITAM';
    }

    return 'MIXED';
  };

  const normalizeOwnerType = (value?: string | null): 'GENERAL' | 'TRADER' | 'CUSTOMER' => {
    const normalized = (value ?? '').toUpperCase();

    if (normalized.includes('TRADER')) {
      return 'TRADER';
    }

    if (normalized.includes('CUSTOMER')) {
      return 'CUSTOMER';
    }

    return 'GENERAL';
  };

  const inferOwnerTypeFromCategoryKey = (key?: string): 'GENERAL' | 'TRADER' | 'CUSTOMER' => {
    const normalized = (key ?? '').toUpperCase();
    if (normalized.startsWith('TRADER:')) {
      return 'TRADER';
    }

    if (normalized.startsWith('CUSTOMER:')) {
      return 'CUSTOMER';
    }

    return 'GENERAL';
  };

  const categoryOwnerTypeMap = new Map<string, ClassificationDailySummaryCategory['ownerType']>();
  for (const category of filteredSortingDailyCategories) {
    categoryOwnerTypeMap.set(
      buildSortingCategoryDisplayLabel(category, lang),
      category.ownerType ?? inferOwnerTypeFromCategoryKey(category.key),
    );
  }

  const allGeneralCategoryLabels = new Set<string>();
  for (const category of filteredSortingDailyCategories) {
    const ownerType = category.ownerType ?? inferOwnerTypeFromCategoryKey(category.key);
    if (ownerType === 'GENERAL') {
      allGeneralCategoryLabels.add(buildSortingCategoryDisplayLabel(category, lang));
    }
  }

  try {
    if (seasonFilterId && sortingAssignmentFilter === 'all') {
      const seasonTraderCategories = await getTraderCategoriesWithShares(seasonFilterId);
      for (const category of seasonTraderCategories) {
        const label = category.name.trim();
        if (!label) {
          continue;
        }

        allGeneralCategoryLabels.add(label);
        categoryOwnerTypeMap.set(label, 'GENERAL');
      }
    }
  } catch {
    // Fallback to default categories below.
  }

  if (allGeneralCategoryLabels.size === 0 && sortingAssignmentFilter === 'all') {
    try {
      const defaultGeneralCategories = await getDefaultTraderCategories();
      for (const category of defaultGeneralCategories) {
        const label = category.name.trim();
        if (!label) {
          continue;
        }

        allGeneralCategoryLabels.add(label);
        categoryOwnerTypeMap.set(label, 'GENERAL');
      }
    } catch {
      // Keep export resilient if categories endpoints are unavailable.
    }
  }

  const getCategoryContextFromDetail = (detail: ClassificationRecord) => {
    const categoryName = detail.customerCategory?.name ?? detail.traderCategory?.name ?? '';
    if (!categoryName) {
      return {
        categoryLabel: '',
        ownerType: 'GENERAL' as const,
        ownerName: '',
      };
    }

    const traderName = detail.trader?.name?.trim();
    const customerName = detail.customer?.customerName?.trim();
    const rawAssignmentType = (detail.assignmentType ?? '').toUpperCase();
    const assignmentType = normalizeOwnerType(detail.assignmentType);

    if (rawAssignmentType === 'GENERAL') {
      return {
        categoryLabel: categoryName,
        ownerType: 'GENERAL' as const,
        ownerName: '',
      };
    }

    if (rawAssignmentType === 'TRADER' || (assignmentType === 'TRADER' && rawAssignmentType !== 'CUSTOMER')) {
      return {
        categoryLabel: traderName ? `${traderName} | ${categoryName}` : `${lang === 'he' ? 'סוחר' : 'Trader'} | ${categoryName}`,
        ownerType: 'TRADER' as const,
        ownerName: traderName ?? '',
      };
    }

    if (rawAssignmentType === 'CUSTOMER' || (assignmentType === 'CUSTOMER' && rawAssignmentType !== 'TRADER')) {
      return {
        categoryLabel: customerName
          ? `${customerName} | ${categoryName}`
          : `${lang === 'he' ? 'לקוח' : 'Customer'} | ${categoryName}`,
        ownerType: 'CUSTOMER' as const,
        ownerName: customerName ?? '',
      };
    }

    if (traderName) {
      return {
        categoryLabel: `${traderName} | ${categoryName}`,
        ownerType: 'TRADER' as const,
        ownerName: traderName,
      };
    }

    if (customerName) {
      return {
        categoryLabel: `${customerName} | ${categoryName}`,
        ownerType: 'CUSTOMER' as const,
        ownerName: customerName,
      };
    }

    return {
      categoryLabel: categoryName,
      ownerType: 'GENERAL' as const,
      ownerName: '',
    };
  };

  const detailsByHarvest = await Promise.all(
    rowsSource.map(async (row) => {
      const details = await getClassificationsByHarvest(row.harvestId);
      return { row, details };
    }),
  );

  const categoryTotals = new Map<string, number>();
  const ownerExistingColumns = new Map<string, Map<string, Set<string>>>();
  const detectedCategoryOwnerType = new Map<string, 'GENERAL' | 'TRADER' | 'CUSTOMER'>();
  const matrixRows: Array<{
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
    values: Record<string, number>;
  }> = [];

  for (const { row, details } of detailsByHarvest) {
    const dayValues: Record<string, number> = {};

    for (const detail of details) {
      const { categoryLabel, ownerType: resolvedOwnerType, ownerName } = getCategoryContextFromDetail(detail);
      if (!categoryLabel) {
        continue;
      }

      if (
        !matchesSortingAssignmentSelection({
          sortingAssignmentFilter,
          ownerType: resolvedOwnerType,
          ownerName,
          traderNameById,
          customerNameById,
          lang,
        })
      ) {
        continue;
      }

      if (!detectedCategoryOwnerType.has(categoryLabel)) {
        detectedCategoryOwnerType.set(categoryLabel, resolvedOwnerType);
      }

      const grade = (detail.grade || detail.customerCategory?.grade || noneLabel).trim();

      const pitamGroup = normalizePitamGroup(detail.pitamStatus);

      const quantity = Number(detail.quantity) || 0;
      const valueKey = `${categoryLabel}::${pitamGroup}::${grade}`;

      if (quantity > 0) {
        dayValues[valueKey] = (dayValues[valueKey] ?? 0) + quantity;

        const ownerType = categoryOwnerTypeMap.get(categoryLabel) ?? detectedCategoryOwnerType.get(categoryLabel);
        if (ownerType === 'CUSTOMER' || ownerType === 'TRADER') {
          if (!ownerExistingColumns.has(categoryLabel)) {
            ownerExistingColumns.set(categoryLabel, new Map<string, Set<string>>());
          }

          const pitamToGrades = ownerExistingColumns.get(categoryLabel)!;
          if (!pitamToGrades.has(pitamGroup)) {
            pitamToGrades.set(pitamGroup, new Set<string>());
          }

          pitamToGrades.get(pitamGroup)!.add(grade);
        }
      }

      if (quantity > 0) {
        categoryTotals.set(categoryLabel, (categoryTotals.get(categoryLabel) ?? 0) + quantity);
      }
    }

    matrixRows.push({
      dateGregorian: formatGregorianDate(row.dateGregorian),
      dateHebrew: row.dateHebrew,
      fieldName: row.fieldName,
      values: dayValues,
    });
  }

  const ownerOrder = (ownerType?: string) => {
    if (ownerType === 'GENERAL') {
      return 0;
    }

    if (ownerType === 'TRADER') {
      return 1;
    }

    if (ownerType === 'CUSTOMER') {
      return 2;
    }

    return 3;
  };

  const compareGrades = (left: string, right: string) => {
    const leftFixedIndex = fixedGrades.indexOf(left);
    const rightFixedIndex = fixedGrades.indexOf(right);

    if (leftFixedIndex >= 0 || rightFixedIndex >= 0) {
      if (leftFixedIndex === -1) {
        return 1;
      }

      if (rightFixedIndex === -1) {
        return -1;
      }

      return leftFixedIndex - rightFixedIndex;
    }

    return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
      sensitivity: 'base',
      numeric: true,
    });
  };

  const preferredCategoryOrder = [...filteredSortingDailyCategories]
    .sort((left, right) => {
      const ownerDiff = ownerOrder(left.ownerType) - ownerOrder(right.ownerType);
      if (ownerDiff !== 0) {
        return ownerDiff;
      }

      const leftLabel = buildSortingCategoryDisplayLabel(left, lang);
      const rightLabel = buildSortingCategoryDisplayLabel(right, lang);

      return leftLabel.localeCompare(rightLabel, lang === 'he' ? 'he' : 'en', {
        sensitivity: 'base',
        numeric: true,
      });
    })
    .map((category) => buildSortingCategoryDisplayLabel(category, lang));

  const missingGeneralCategories = Array.from(allGeneralCategoryLabels)
    .filter((label) => !preferredCategoryOrder.includes(label))
    .sort((left, right) =>
      left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    );

  preferredCategoryOrder.unshift(...missingGeneralCategories);

  const extraCategories = Array.from(categoryTotals.keys())
    .filter((label) => !preferredCategoryOrder.includes(label))
    .sort((left, right) => {
      const leftOwnerType = categoryOwnerTypeMap.get(left) ?? detectedCategoryOwnerType.get(left);
      const rightOwnerType = categoryOwnerTypeMap.get(right) ?? detectedCategoryOwnerType.get(right);
      const ownerDiff = ownerOrder(leftOwnerType) - ownerOrder(rightOwnerType);
      if (ownerDiff !== 0) {
        return ownerDiff;
      }

      return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
        sensitivity: 'base',
        numeric: true,
      });
    });

  const preferredOrderIndex = new Map<string, number>();
  preferredCategoryOrder.forEach((label, index) => {
    preferredOrderIndex.set(label, index);
  });

  const orderedCategories = Array.from(new Set([...preferredCategoryOrder, ...extraCategories])).sort((left, right) => {
    const leftOwnerType = categoryOwnerTypeMap.get(left) ?? detectedCategoryOwnerType.get(left);
    const rightOwnerType = categoryOwnerTypeMap.get(right) ?? detectedCategoryOwnerType.get(right);
    const ownerDiff = ownerOrder(leftOwnerType) - ownerOrder(rightOwnerType);
    if (ownerDiff !== 0) {
      return ownerDiff;
    }

    const leftIndex = preferredOrderIndex.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = preferredOrderIndex.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
      sensitivity: 'base',
      numeric: true,
    });
  });

  const groups = orderedCategories.map((categoryLabel) => {
    const ownerType = categoryOwnerTypeMap.get(categoryLabel) ?? detectedCategoryOwnerType.get(categoryLabel);

    if (ownerType === 'CUSTOMER' || ownerType === 'TRADER') {
      const pitamToGrades = ownerExistingColumns.get(categoryLabel);
      const pitamGroupsForCustomer = pitamGroups
        .map((pitam) => {
          const existingGrades = Array.from(pitamToGrades?.get(pitam.key) ?? []).sort(compareGrades);

          return {
            ...pitam,
            grades: existingGrades,
          };
        })
        .filter((pitam) => pitam.grades.length > 0);

      return {
        categoryLabel,
        total: categoryTotals.get(categoryLabel) ?? 0,
        pitamGroups: pitamGroupsForCustomer,
      };
    }

    return {
      categoryLabel,
      total: categoryTotals.get(categoryLabel) ?? 0,
      pitamGroups: pitamGroups.map((pitam) => ({
        ...pitam,
        grades: [...fixedGrades],
      })),
    };
  });

  return {
    fixedHeaders: [fixedHeaders.dateGregorian, fixedHeaders.dateHebrew, fixedHeaders.fieldName],
    groups,
    rows: matrixRows,
  };
}
