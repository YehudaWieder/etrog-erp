import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';
import type { Field } from '../../../../services/fieldsApi';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import type { Season } from '../../../../services/seasonsApi';
import type { HarvestI18n } from '../../i18n';

import { HarvestPageHeaderActions } from '../../components/shared/HarvestPageHeaderActions';
import { HarvestSummaryHeaderActions } from '../../components/shared/HarvestSummaryHeaderActions';

type SortingAssignmentFilterOption = {
  value: string;
  label: string;
  group?: string;
};

type DateFilterOption = {
  value: string;
  label: string;
};

type UseHarvestPageControlsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  isDailyDetailsTab: boolean;
  isSortingDailyDetailsTab: boolean;
  isSortingSummaryTab: boolean;
  isHarvestSummaryTab: boolean;
  isSortingListTab: boolean;
  detailsRecord: HarvestRecord | null;
  selectedHarvestRow: HarvestRecord | null;
  selectedSortingDailyRowId: number | null;
  openHarvestGlobalForm: () => void;
  openHarvestSortingGlobalForm: () => void;
  onDeleteHarvest: () => void;
  selectedSortingListRow: ClassificationListRecord | null;
  onEditSortingListRow: () => void;
  onDeleteSortingListRow: () => void;
  activeSeasonId: number | null;
  seasons: Season[];
  fields: Field[];
  sortingAssignmentFilterOptions: SortingAssignmentFilterOption[];
  harvestDateOptions: DateFilterOption[];
};

export function useHarvestPageControls({
  lang,
  t,
  isDailyDetailsTab,
  isSortingDailyDetailsTab,
  isSortingSummaryTab,
  isHarvestSummaryTab,
  isSortingListTab,
  detailsRecord,
  selectedHarvestRow,
  selectedSortingDailyRowId,
  openHarvestGlobalForm,
  openHarvestSortingGlobalForm,
  onDeleteHarvest,
  selectedSortingListRow,
  onEditSortingListRow,
  onDeleteSortingListRow,
  activeSeasonId,
  seasons,
  fields,
  sortingAssignmentFilterOptions,
  harvestDateOptions,
}: UseHarvestPageControlsParams) {
  const addActionLabel = t.pageControls.addHarvest;
  const addSortingActionLabel = t.pageControls.addSorting;
  const editActionLabel = t.pageControls.edit;
  const deleteActionLabel = t.pageControls.delete;
  const deleteHarvestBlockedTitle = t.pageControls.deleteHarvestBlockedTitle;

  const pageHeaderActions = useMemo<ReactNode>(() => {
    if (isDailyDetailsTab) {
      const harvestHasSortings = (selectedHarvestRow?.classifiedTotal ?? 0) > 0;
      return (
        <HarvestPageHeaderActions
          addActionLabel={addActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestGlobalForm}
          onDelete={onDeleteHarvest}
          editDisabled={!selectedHarvestRow}
          deleteDisabled={!selectedHarvestRow || harvestHasSortings}
          deleteTitle={harvestHasSortings ? deleteHarvestBlockedTitle : undefined}
        />
      );
    }

    if (isSortingDailyDetailsTab) {
      return (
        <HarvestPageHeaderActions
          addActionLabel={addSortingActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestSortingGlobalForm}
          onDelete={() => void 0}
          editDisabled={false}
          deleteDisabled
          showEdit={false}
          showDelete={false}
        />
      );
    }

    if (isSortingSummaryTab || isHarvestSummaryTab) {
      return (
        <HarvestSummaryHeaderActions
          addHarvestLabel={addActionLabel}
          addSortingLabel={addSortingActionLabel}
          onAddHarvest={openHarvestGlobalForm}
          onAddSorting={openHarvestSortingGlobalForm}
        />
      );
    }

    if (isSortingListTab) {
      return (
        <HarvestPageHeaderActions
          addActionLabel={addSortingActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestSortingGlobalForm}
          onEdit={onEditSortingListRow}
          onDelete={onDeleteSortingListRow}
          editDisabled={!selectedSortingListRow}
          deleteDisabled={!selectedSortingListRow}
        />
      );
    }

    return null;
  }, [
    addActionLabel,
    addSortingActionLabel,
    deleteActionLabel,
    deleteHarvestBlockedTitle,
    detailsRecord,
    editActionLabel,
    isDailyDetailsTab,
    isHarvestSummaryTab,
    isSortingDailyDetailsTab,
    isSortingListTab,
    isSortingSummaryTab,
    onDeleteHarvest,
    onEditSortingListRow,
    onDeleteSortingListRow,
    openHarvestGlobalForm,
    openHarvestSortingGlobalForm,
    selectedHarvestRow,
    selectedSortingDailyRowId,
    selectedSortingListRow,
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

    const dateFilter: GlobalScopedFilterConfig = {
      key: 'harvestDate',
      label: isSortingDailyDetailsTab
        ? t.sortingDailyDetails.filters.dateFilterLabel
        : isSortingListTab
          ? t.sortingList.filters.dateFilterLabel
          : t.dailyDetails.filters.dateFilterLabel,
      defaultValue: 'all',
      queryParam: 'hdDate',
      options: harvestDateOptions,
      ...(isSortingListTab ? { type: 'calendar' as const, lang } : {}),
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

    const methodFilter: GlobalScopedFilterConfig = {
      key: 'fieldReportMethod',
      label: t.fieldReport.filters.methodFilterLabel,
      defaultValue: 'our',
      queryParam: 'frMethod',
      options: [
        { value: 'our', label: t.fieldReport.filters.ourMethod },
        { value: 'franco', label: t.fieldReport.filters.franco },
      ],
    };

    if (isHarvestSummaryTab) {
      return [seasonFilter, methodFilter];
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

    if (isSortingListTab) {
      return [
        seasonFilter,
        dateFilter,
        {
          key: 'sortingAssignmentType',
          label: t.sortingDailyDetails.filters.assignmentFilterLabel,
          defaultValue: 'all',
          queryParam: 'slAssign',
          options: sortingAssignmentFilterOptions,
        },
      ];
    }

    return [seasonFilter, fieldFilter];
  }, [
    activeSeasonId,
    fields,
    harvestDateOptions,
    isDailyDetailsTab,
    isHarvestSummaryTab,
    isSortingDailyDetailsTab,
    isSortingListTab,
    seasons,
    sortingAssignmentFilterOptions,
    t.dailyDetails.filters,
    t.fieldReport.filters,
    t.sortingDailyDetails.filters,
    t.sortingList.filters,
  ]);

  return {
    filters,
    pageHeaderActions,
  };
}



