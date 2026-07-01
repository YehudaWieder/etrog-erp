import { useMemo } from 'react';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestI18n } from '../../i18n';

type RelatedSortingsLabels = HarvestI18n['dailyDetails']['detailsPanel']['relatedSortings'];

type UseHarvestRelatedSortingsParams = {
  lang: 'he' | 'en';
  relatedSortings: ClassificationRecord[];
  relatedSortingsLabels: RelatedSortingsLabels;
  noneValue: string;
  traderCategories?: TraderCategoryWithShares[];
};

export function useHarvestRelatedSortings({
  lang,
  relatedSortings,
  relatedSortingsLabels,
  noneValue,
  traderCategories = [],
}: UseHarvestRelatedSortingsParams) {
  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  const sortedRelatedSortings = useMemo(() => {
    const locale = lang === 'he' ? 'he' : 'en';

    const getAssignmentOrder = (assignmentType: string) => {
      if (assignmentType === 'GENERAL') {
        return 0;
      }

      if (assignmentType === 'TRADER') {
        return 1;
      }

      if (assignmentType === 'CUSTOMER') {
        return 2;
      }

      return 3;
    };

    const getCategoryNameForSort = (row: ClassificationRecord) => row.customerCategory?.name ?? row.traderCategory?.name ?? '';

    const getGradeForSort = (row: ClassificationRecord) => row.grade ?? row.customerCategory?.grade ?? '';

    const compareCategoryNames = (a: string, b: string) => {
      const ai = traderCategoryOrder.get(a);
      const bi = traderCategoryOrder.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return a.localeCompare(b, locale, { sensitivity: 'base', numeric: true });
    };

    return [...relatedSortings].sort((a, b) => {
      const assignmentDiff = getAssignmentOrder(a.assignmentType) - getAssignmentOrder(b.assignmentType);
      if (assignmentDiff !== 0) {
        return assignmentDiff;
      }

      const categoryDiff = compareCategoryNames(getCategoryNameForSort(a), getCategoryNameForSort(b));
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return getGradeForSort(a).localeCompare(getGradeForSort(b), locale, {
        sensitivity: 'base',
        numeric: true,
      });
    });
  }, [lang, relatedSortings, traderCategoryOrder]);

  const getRelatedSortingAssignmentLabel = (assignmentType: string) => {
    if (assignmentType === 'TRADER') {
      return relatedSortingsLabels.assignmentTypes.trader;
    }

    if (assignmentType === 'CUSTOMER') {
      return relatedSortingsLabels.assignmentTypes.customer;
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingTarget = (row: ClassificationRecord) => {
    if (row.assignmentType === 'TRADER') {
      return row.trader?.name ?? noneValue;
    }

    if (row.assignmentType === 'CUSTOMER') {
      return row.customer?.customerName ?? noneValue;
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingCategory = (row: ClassificationRecord) => {
    if (row.customerCategory?.name) {
      return row.customerCategory.name;
    }

    if (row.traderCategory?.name) {
      return row.traderCategory.name;
    }

    return noneValue;
  };

  const getRelatedSortingGrade = (row: ClassificationRecord) => {
    if (row.grade) {
      return row.grade;
    }

    if (row.customerCategory?.grade) {
      return row.customerCategory.grade;
    }

    return noneValue;
  };

  const formatRelatedSortingText = (value?: string | null) => {
    if (!value) {
      return noneValue;
    }

    const normalizedValue = value.replace(/\s+/g, '_').toUpperCase();

    if (normalizedValue === 'WITH_PITAM') {
      return relatedSortingsLabels.pitamValues.withPitam;
    }

    if (normalizedValue === 'WITHOUT_PITAM') {
      return relatedSortingsLabels.pitamValues.withoutPitam;
    }

    return value.replace(/_/g, ' ');
  };

  const getRelatedSortingNote = (row: ClassificationRecord) => row.notes?.trim() ?? '';

  return {
    formatRelatedSortingText,
    getRelatedSortingAssignmentLabel,
    getRelatedSortingCategory,
    getRelatedSortingGrade,
    getRelatedSortingNote,
    getRelatedSortingTarget,
    sortedRelatedSortings,
  };
}



