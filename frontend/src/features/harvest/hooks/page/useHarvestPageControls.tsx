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
  isSortingListTrashTab: boolean;
  detailsRecord: HarvestRecord | null;
  selectedHarvestRow: HarvestRecord | null;
  selectedSortingDailyRowId: number | null;
  openHarvestGlobalForm: () => void;
  openHarvestSortingGlobalForm: () => void;
  onEditHarvestRow: () => void;
  onDeleteHarvest: () => void;
  selectedSortingListRow: ClassificationListRecord | null;
  onEditSortingListRow: () => void;
  onDeleteSortingListRow: () => void;
  selectedDeletedSortingListRow: ClassificationListRecord | null;
  onRestoreDeletedSortingListRow: () => void;
  onPermanentDeleteSortingListRow: () => void;
  activeSeasonId: number | null;
  seasonFilterId: number | null;
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
  isSortingListTrashTab,
  detailsRecord,
  selectedHarvestRow,
  selectedSortingDailyRowId,
  openHarvestGlobalForm,
  openHarvestSortingGlobalForm,
  onEditHarvestRow,
  onDeleteHarvest,
  selectedSortingListRow,
  onEditSortingListRow,
  onDeleteSortingListRow,
  selectedDeletedSortingListRow,
  onRestoreDeletedSortingListRow,
  onPermanentDeleteSortingListRow,
  activeSeasonId,
  seasonFilterId,
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
  const nonActiveSeasonDisabledTitle = t.pageControls.nonActiveSeasonDisabled;
  const isViewingNonActiveSeason = seasonFilterId !== null && seasonFilterId !== activeSeasonId;

  const pageHeaderActions = useMemo<ReactNode>(() => {
    if (isDailyDetailsTab) {
      const harvestHasSortings = (selectedHarvestRow?.classifiedTotal ?? 0) > 0;
      return (
        <HarvestPageHeaderActions
          addActionLabel={addActionLabel}
          editActionLabel={editActionLabel}
          deleteActionLabel={deleteActionLabel}
          onAdd={openHarvestGlobalForm}
          onEdit={onEditHarvestRow}
          onDelete={onDeleteHarvest}
          addDisabled={isViewingNonActiveSeason}
          editDisabled={!selectedHarvestRow || isViewingNonActiveSeason}
          deleteDisabled={!selectedHarvestRow || harvestHasSortings || isViewingNonActiveSeason}
          addTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
          deleteTitle={
            isViewingNonActiveSeason
              ? nonActiveSeasonDisabledTitle
              : harvestHasSortings
                ? deleteHarvestBlockedTitle
                : undefined
          }
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
          addDisabled={isViewingNonActiveSeason}
          addTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
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
          addDisabled={isViewingNonActiveSeason}
          addTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
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
          addDisabled={isViewingNonActiveSeason}
          editDisabled={!selectedSortingListRow || isViewingNonActiveSeason}
          deleteDisabled={!selectedSortingListRow || isViewingNonActiveSeason}
          addTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
          deleteTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
        />
      );
    }

    if (isSortingListTrashTab) {
      return (
        <HarvestPageHeaderActions
          addActionLabel={t.pageControls.restore}
          editActionLabel={t.pageControls.restore}
          deleteActionLabel={t.pageControls.permanentDelete}
          onAdd={onRestoreDeletedSortingListRow}
          onEdit={onRestoreDeletedSortingListRow}
          onDelete={onPermanentDeleteSortingListRow}
          showAdd={false}
          editDisabled={!selectedDeletedSortingListRow || isViewingNonActiveSeason}
          deleteDisabled={!selectedDeletedSortingListRow || isViewingNonActiveSeason}
          deleteTitle={isViewingNonActiveSeason ? nonActiveSeasonDisabledTitle : undefined}
        />
      );
    }

    return null;
  }, [
    addActionLabel,
    addSortingActionLabel,
    deleteActionLabel,
    deleteHarvestBlockedTitle,
    nonActiveSeasonDisabledTitle,
    isViewingNonActiveSeason,
    detailsRecord,
    editActionLabel,
    isDailyDetailsTab,
    isHarvestSummaryTab,
    isSortingDailyDetailsTab,
    isSortingListTab,
    isSortingSummaryTab,
    onEditHarvestRow,
    onDeleteHarvest,
    onEditSortingListRow,
    onDeleteSortingListRow,
    onRestoreDeletedSortingListRow,
    onPermanentDeleteSortingListRow,
    openHarvestGlobalForm,
    openHarvestSortingGlobalForm,
    selectedHarvestRow,
    selectedSortingDailyRowId,
    selectedSortingListRow,
    selectedDeletedSortingListRow,
    t.pageControls.restore,
    t.pageControls.permanentDelete,
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
        : (isSortingListTab || isSortingListTrashTab || isSortingSummaryTab)
          ? t.sortingList.filters.dateFilterLabel
          : t.dailyDetails.filters.dateFilterLabel,
      defaultValue: 'all',
      queryParam: 'hdDate',
      options: harvestDateOptions,
      ...((isSortingListTab || isSortingListTrashTab || isSortingSummaryTab) ? { type: 'calendar' as const, lang } : {}),
    };

    const fieldFilter: GlobalScopedFilterConfig = {
      key: 'fieldId',
      label: isSortingDailyDetailsTab
        ? t.sortingDailyDetails.filters.fieldFilterLabel
        : isSortingSummaryTab
          ? t.sortingList.filters.fieldFilterLabel
          : t.dailyDetails.filters.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'hdField',
      options: [
        {
          value: 'all',
          label: isSortingDailyDetailsTab
            ? t.sortingDailyDetails.filters.allFieldsOption
            : isSortingSummaryTab
              ? t.sortingList.filters.allFieldsOption
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

    if (isSortingSummaryTab) {
      return [seasonFilter, dateFilter, fieldFilter];
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

    if (isSortingListTab || isSortingListTrashTab) {
      return [
        seasonFilter,
        dateFilter,
        {
          key: 'sortingAssignmentType',
          label: t.sortingDailyDetails.filters.assignmentFilterLabel,
          defaultValue: 'all',
          queryParam: isSortingListTrashTab ? 'slTrashAssign' : 'slAssign',
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
    isSortingListTrashTab,
    isSortingSummaryTab,
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



