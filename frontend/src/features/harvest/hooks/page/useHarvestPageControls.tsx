import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { Field } from '../../../../services/fieldsApi';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import type { Season } from '../../../../services/seasonsApi';
import type { HarvestI18n } from '../../i18n';
import { HarvestAddHeaderAction } from '../../components/shared/HarvestAddHeaderAction';
import { HarvestPageHeaderActions } from '../../components/shared/HarvestPageHeaderActions';

type SortingAssignmentFilterOption = {
  value: string;
  label: string;
  group?: string;
};

type UseHarvestPageControlsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  isDailyDetailsTab: boolean;
  isFieldReportTab: boolean;
  isSortingDailyDetailsTab: boolean;
  detailsRecord: HarvestRecord | null;
  sortingDailyDetailsRowId: number | null;
  openHarvestGlobalForm: () => void;
  activeSeasonId: number | null;
  seasons: Season[];
  fields: Field[];
  sortingAssignmentFilterOptions: SortingAssignmentFilterOption[];
};

export function useHarvestPageControls({
  lang,
  t,
  isDailyDetailsTab,
  isFieldReportTab,
  isSortingDailyDetailsTab,
  detailsRecord,
  sortingDailyDetailsRowId,
  openHarvestGlobalForm,
  activeSeasonId,
  seasons,
  fields,
  sortingAssignmentFilterOptions,
}: UseHarvestPageControlsParams) {
  const addActionLabel = lang === 'he' ? 'הוסף קטיף' : 'Add Harvest';
  const addSortingActionLabel = lang === 'he' ? 'הוספת מיון' : 'Add Sorting';
  const editActionLabel = lang === 'he' ? 'עריכה' : 'Edit';
  const deleteActionLabel = lang === 'he' ? 'מחיקה' : 'Delete';

  const pageHeaderActions = useMemo<ReactNode>(() => {
    if (isDailyDetailsTab) {
      return (
        <HarvestPageHeaderActions
          addActionLabel={addActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestGlobalForm}
          editDisabled={!detailsRecord}
          deleteDisabled={!detailsRecord}
        />
      );
    }

    if (isFieldReportTab) {
      return <HarvestAddHeaderAction label={addActionLabel} onClick={openHarvestGlobalForm} />;
    }

    if (isSortingDailyDetailsTab) {
      return (
        <HarvestPageHeaderActions
          addActionLabel={addSortingActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestGlobalForm}
          editDisabled={sortingDailyDetailsRowId === null}
          deleteDisabled={sortingDailyDetailsRowId === null}
        />
      );
    }

    return null;
  }, [
    addActionLabel,
    addSortingActionLabel,
    deleteActionLabel,
    detailsRecord,
    editActionLabel,
    isDailyDetailsTab,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    openHarvestGlobalForm,
    sortingDailyDetailsRowId,
  ]);

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.dailyDetails.filters.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'hdSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${t.dailyDetails.filters.activeSeasonBadge})` : ''}`,
            }))
          : [{ value: '', label: t.dailyDetails.filters.noActiveSeason }],
    };

    const fieldFilter: GlobalScopedFilterConfig = {
      key: 'fieldId',
      label: isSortingDailyDetailsTab
        ? t.sortingDailyDetails.filters.fieldFilterLabel
        : t.dailyDetails.filters.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'hdField',
      options: [
        {
          value: 'all',
          label: isSortingDailyDetailsTab
            ? t.sortingDailyDetails.filters.allFieldsOption
            : t.dailyDetails.filters.allFieldsOption,
        },
        ...fields.map((field) => ({
          value: String(field.id),
          label: field.name,
        })),
      ],
    };

    if (isFieldReportTab) {
      return [seasonFilter];
    }

    if (isSortingDailyDetailsTab) {
      return [
        seasonFilter,
        fieldFilter,
        {
          key: 'sortingAssignmentType',
          label: t.sortingDailyDetails.filters.assignmentFilterLabel,
          defaultValue: 'all',
          queryParam: 'sdAssign',
          options: sortingAssignmentFilterOptions,
        },
      ];
    }

    return [seasonFilter, fieldFilter];
  }, [
    activeSeasonId,
    fields,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    seasons,
    sortingAssignmentFilterOptions,
    t.dailyDetails.filters,
    t.sortingDailyDetails.filters,
  ]);

  return {
    filters,
    pageHeaderActions,
  };
}



