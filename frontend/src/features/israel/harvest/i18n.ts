import type { SidebarSection } from '../../../types/navigation';
import { ISRAEL_HARVEST_I18N_EN } from './i18n.en';
import { ISRAEL_HARVEST_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type IsraelHarvestI18n = {
  pageTitle: string;
  settings: string;
  sidebar: SidebarSection[];
  emptyState: Record<string, EmptyStateContent> & {
    default: EmptyStateContent;
  };
  pageControls: {
    addHarvest: string;
    addSorting: string;
  };
  sortingForm: {
    ariaLabel: string;
    closeLabel: string;
    title: string;
    instructions: string;
    harvestLabel: string;
    harvestPlaceholder: string;
    dateGregorianLabel: string;
    dateHebrewLabel: string;
    quantityLabel: string;
    classifiedTotalLabel: string;
    remainingLabel: string;
    selectHarvestHint: string;
    loadingExistingClassifications: string;
    alreadyFullySortedMessage: string;
    harvestRequiredError: string;
    save: string;
    saving: string;
    saveFailedError: string;
  };
  harvestForm: {
    ariaLabel: string;
    closeLabel: string;
    title: string;
    instructions: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    gregorianDateLabel: string;
    hebrewDateLabel: string;
    quantityLabel: string;
    quantityPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    classificationModeLabel: string;
    classificationModeHint: string;
    fullSorting: string;
    partialSorting: string;
    sortingRowsTitle: string;
    addSortingRow: string;
    removeSortingRow: string;
    sortingRowPrefix: (index: number) => string;
    fieldCategoryLabel: string;
    fieldCategoryPlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    pitamStatusLabel: string;
    pitamOptions: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
    quantityMatrixQuantityHeader: string;
    selectFieldCategoryFirstHint: string;
    selectCategoryForQuantitiesHint: string;
    sortingNotesLabel: string;
    sortingNotesPlaceholder: string;
    sortingTotalQuantityLabel: string;
    fullSortingRequiredHint: (requiredTotal: number) => string;
    fullSortingReduceHint: (amount: number) => string;
    fullSortingIncreaseHint: (amount: number) => string;
    fullSortingMatchHint: string;
    duplicateSortingRowError: string;
    addSortingRowBlockedError: string;
    cancel: string;
    save: string;
    saving: string;
    fieldRequiredError: string;
    gregorianDateRequiredError: string;
    quantityRequiredError: string;
    sortingTotalMustMatchAvailableForFullSorting: (
      requiredTotal: number,
    ) => string;
    sortingTotalMustBeLessForPartialSorting: (requiredTotal: number) => string;
    saveFailedError: string;
    sortingSaveFailedError: string;
  };
  fieldReport: {
    description: string;
    loading: string;
    loadError: string;
    empty: string;
    tableActionsLabel: string;
    printTitle: string;
    printAriaLabel: string;
    exportTitle: string;
    exportAriaLabel: string;
    exportError: string;
    printWindowTitle: string;
    sheetName: string;
    seasonFilterLabel: string;
    summary: {
      totalQuantity: string;
      totalRecordCount: string;
      totalFields: string;
      avgQuantityPerHarvest: string;
    };
    columns: {
      fieldName: string;
      recordCount: string;
      totalQuantity: string;
      avgQuantityPerHarvest: string;
    };
  };
};

export const ISRAEL_HARVEST_I18N: Record<'he' | 'en', IsraelHarvestI18n> = {
  he: ISRAEL_HARVEST_I18N_HE,
  en: ISRAEL_HARVEST_I18N_EN,
};
