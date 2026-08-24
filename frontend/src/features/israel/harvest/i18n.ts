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
    editHarvest: string;
    deleteHarvest: string;
    deleteHarvestDialog: {
      title: string;
      message: string;
      confirm: string;
      cancel: string;
    };
    deleteHarvestHasSortingsTitle: string;
    deleteHarvestFailedError: string;
    editSorting: string;
    deleteSorting: string;
    editSortingDialog: {
      title: string;
      quantityLabel: string;
      notesLabel: string;
      confirm: string;
      cancel: string;
      saveFailedError: string;
    };
    deleteSortingDialog: {
      title: string;
      message: string;
      confirm: string;
      cancel: string;
    };
    deleteSortingFailedError: string;
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
    existingClassificationCellBlockedHint: string;
    existingClassificationRowHint: string;
    addExistingClassificationQuantityLabel: string;
    cancelExistingClassificationCellLabel: string;
    addExistingClassificationQuantityPopupTitle: string;
    addExistingClassificationQuantityPopupPrefix: string;
    addExistingClassificationQuantityPopupGradeWord: string;
    addExistingClassificationQuantityPopupInstruction: string;
    addExistingClassificationQuantityConfirmLabel: string;
    addExistingClassificationQuantityInvalidError: string;
    editExistingClassificationQuantityLabel: string;
    editExistingClassificationQuantityPopupTitle: string;
    editExistingClassificationQuantityPopupInstruction: string;
    existingClassificationQuantityAddModeLabel: string;
    existingClassificationQuantitySubtractModeLabel: string;
    subtractExistingClassificationQuantityConfirmLabel: string;
    subtractExistingClassificationQuantityInvalidError: string;
    subtractExistingClassificationQuantityExceedsBaseError: (
      baseQuantity: number,
    ) => string;
    existingClassificationCellInvalidQuantityError: string;
    existingClassificationCellSaveError: string;
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
  editHarvestForm: {
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
    cancel: string;
    save: string;
    saving: string;
    fieldRequiredError: string;
    gregorianDateRequiredError: string;
    quantityRequiredError: string;
    saveFailedError: string;
    classificationsSaveFailedError: string;
    pendingRemovedSortingRowsTitle: string;
    pendingRemovedSortingRowsHint: string;
    restorePendingRemovedSortingRow: string;
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
    detailsColumnHeader: string;
    detailsPanel: {
      openDetailsAriaLabel: (fieldName: string) => string;
      title: (fieldName?: string) => string;
      closeLabel: string;
      printLabel: string;
      printWindowTitle: string;
      empty: string;
      columns: {
        dateGregorian: string;
        dateHebrew: string;
        quantity: string;
        notes: string;
        updatedBy: string;
      };
    };
  };
  sortingSummary: {
    loading: string;
    loadError: string;
    empty: string;
    retry: string;
    tableTitle: string;
    seasonFilterLabel: string;
    description: string;
    actionsLabel: string;
    printTitle: string;
    printAriaLabel: string;
    exportTitle: string;
    exportAriaLabel: string;
    exportError: string;
    printWindowTitle: string;
    columns: {
      category: string;
      withPitam: string;
      withoutPitam: string;
      mixed: string;
      total: string;
    };
    grandTotalLabel: string;
    breakdown: {
      grade: string;
    };
    gradeGroups: {
      title: string;
      groupColumn: string;
      percentColumn: string;
      ungrouped: string;
    };
    filters: {
      dateFilterLabel: string;
      allDatesOption: string;
      fieldFilterLabel: string;
      allFieldsOption: string;
    };
  };
  sortingList: {
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
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      fieldCategory: string;
      category: string;
      grade: string;
      pitamStatus: string;
      quantity: string;
      notes: string;
    };
  };
  sortingDailyDetails: {
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
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      total: string;
    };
    summary: {
      totalSorted: string;
      totalHarvests: string;
    };
    detailsColumnHeader: string;
    detailsPanel: {
      title: string;
      closeLabel: string;
      printLabel: string;
      printWindowTitle: string;
      openDetailsAriaLabel: string;
      sortingDetailsTitle: string;
      matrixTitle: string;
      matrixColumns: {
        category: string;
        withPitam: string;
        withoutPitam: string;
        mixed: string;
        total: string;
      };
      grandTotalLabel: string;
      breakdown: {
        grade: string;
      };
      gradeGroups: {
        title: string;
        groupColumn: string;
        percentColumn: string;
        ungrouped: string;
      };
    };
  };
  dailyDetails: {
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
      avgQuantityPerHarvest: string;
    };
    columns: {
      fieldName: string;
      dateGregorian: string;
      dateHebrew: string;
      quantity: string;
      totalSorted: string;
      notes: string;
      updatedBy: string;
    };
    detailsColumnHeader: string;
    detailsPanel: {
      title: string;
      closeLabel: string;
      printLabel: string;
      printWindowTitle: string;
      noNotes: string;
      openDetailsAriaLabel: string;
      fields: {
        dateGregorian: string;
        dateHebrew: string;
        field: string;
        quantity: string;
        notes: string;
        updatedBy: string;
      };
      relatedSortingsTitle: string;
      relatedSortingsEmpty: string;
      relatedSortingsLoading: string;
      relatedSortingsLoadError: string;
      relatedSortingsColumns: {
        fieldCategory: string;
        category: string;
        grade: string;
        pitamStatus: string;
        quantity: string;
        notes: string;
      };
      gradeGroups: {
        title: string;
        groupColumn: string;
        percentColumn: string;
        ungrouped: string;
      };
    };
  };
};

export const ISRAEL_HARVEST_I18N: Record<'he' | 'en', IsraelHarvestI18n> = {
  he: ISRAEL_HARVEST_I18N_HE,
  en: ISRAEL_HARVEST_I18N_EN,
};
