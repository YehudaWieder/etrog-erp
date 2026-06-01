import type { NavItem, SidebarSection } from '../../types/navigation';
import { HARVEST_I18N_EN } from './i18n.en';
import { HARVEST_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type HarvestI18n = {
  tableActionsLabel: string;
  pageControls: {
    addHarvest: string;
    addSorting: string;
    edit: string;
    delete: string;
  };
  bulkForm: {
    ariaLabel: string;
    closeLabel: string;
    title: string;
    instructions: string;
    fieldLabel: string;
    fieldPlaceholder: string;
    gregorianDateLabel: string;
    hebrewDatePlaceholder: string;
    hebrewDateLabel: string;
    totalHarvestedPlaceholder: string;
    totalRejectedPlaceholder: string;
    ownerHarvestedPlaceholder: string;
    ownerHarvestedLabel: string;
    ownerRejectedPlaceholder: string;
    ownerRejectedLabel: string;
    classificationModeLabel: string;
    classificationModeHint: string;
    fullSorting: string;
    partialSorting: string;
    notesPlaceholder: string;
    notesLabel: string;
    sortingRowsTitle: string;
    addSortingRow: string;
    sortingRowPrefix: (index: number) => string;
    removeSortingRow: string;
    assignmentOptions: {
      general: string;
      trader: string;
      customer: string;
    };
    traderCategoryPlaceholder: string;
    traderPlaceholder: string;
    customerPlaceholder: string;
    customerCategoryPlaceholder: string;
    gradePlaceholder: string;
    pitamOptions: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
    quantityPlaceholder: string;
    sortingNotesPlaceholder: string;
    addSortingRowBlockedError: string;
    addSortingRowSummaryFieldsRequiredError: string;
    addSortingRowMaxReachedError: string;
    cancel: string;
    save: string;
    saving: string;
  };
  tableLabels: {
    details: string;
    sort: string;
    showSortingRowDetails: string;
    viewAllFieldDetails: (fieldName: string) => string;
  };
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  formSubmission: {
    seasonRequired: string;
    fieldRequired: string;
    gregorianDateRequired: string;
    hebrewDateRequired: string;
    totalHarvestedRequired: string;
    totalRejectedRequired: string;
    sortingHarvestRequired: string;
    sortingQuantityRequired: string;
    sortingTraderCategoryRequired: string;
    sortingGradeRequired: string;
    sortingTraderRequired: string;
    sortingCustomerRequired: string;
    sortingCustomerCategoryRequired: string;
    sortingTotalExceedsAvailable: (maxAllowed: number) => string;
    sortingTotalMustMatchAvailableForFullSorting: (requiredTotal: number) => string;
    sortingTotalWithClassifiedMustMatchAvailableForFullSorting: (requiredTotal: number) => string;
    sortingTotalMustBeAtMostAvailableMinusOneForPartialSorting: (maximumTotal: number) => string;
    sortingRowRequired: string;
    addSortingRowTotalsRequiredError: string;
    addSortingRowSummaryFieldsRequiredError: string;
    sortingRowQuantityRequired: (rowNumber: number) => string;
    traderCategoryRequired: (rowNumber: number) => string;
    gradeRequired: (rowNumber: number) => string;
    traderRequired: (rowNumber: number) => string;
    customerRequired: (rowNumber: number) => string;
    customerCategoryRequired: (rowNumber: number) => string;
  };
  sortingForm: {
    ariaLabel: string;
    closeLabel: string;
    title: string;
    instructions: string;
    harvestLabel: string;
    harvestPlaceholder: string;
    dateGregorianLabel: string;
    totalHarvestedLabel: string;
    totalRejectedLabel: string;
    classifiedTotalLabel: string;
    save: string;
    saving: string;
  };
  dailyDetails: {
    description: string;
    loading: string;
    loadError: string;
    empty: string;
    printHeading: string;
    printWindowTitle: string;
    sheetName: string;
    exportError: string;
    printActions: {
      printAriaLabel: string;
      printTitle: string;
      exportAriaLabel: string;
      exportTitle: string;
    };
    activeSeason: (yearName: string) => string;
    filters: {
      seasonFilterLabel: string;
      fieldFilterLabel: string;
      activeSeasonBadge: string;
      noActiveSeason: string;
      allFieldsOption: string;
    };
    selection: {
      selectedCells: (count: number) => string;
      total: (value: string) => string;
      clear: string;
    };
    detailsPanel: {
      openDetails: string;
      title: string;
      empty: string;
      close: string;
      print: string;
      relatedSortings: {
        title: string;
        loading: string;
        empty: string;
        loadError: string;
        columns: {
          assignmentType: string;
          target: string;
          category: string;
          grade: string;
          pitamStatus: string;
          quantity: string;
          updatedBy: string;
          notes: string;
        };
        assignmentTypes: {
          general: string;
          trader: string;
          customer: string;
        };
        pitamValues: {
          withPitam: string;
          withoutPitam: string;
        };
      };
      fields: {
        id: string;
        season: string;
        harvestNumber: string;
        field: string;
        dateGregorian: string;
        dateHebrew: string;
        totalHarvested: string;
        totalRejected: string;
        totalAfterRejected: string;
        ownerHarvested: string;
        ownerRejected: string;
        ownerAfterRejected: string;
        classifiedTotal: string;
        rejectionRate: string;
        ownerRejectionRate: string;
        classificationStatus: string;
        updatedBy: string;
        updatedAt: string;
        notes: string;
      };
      values: {
        partial: string;
        final: string;
        none: string;
        statusPrefix: string;
        rowType: string;
        generalRow: string;
        ownerRow: string;
        differenceRow: string;
      };
    };
    partial: string;
    final: string;
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      totalHarvested: string;
      totalRejected: string;
      netHarvest: string;
      classifiedTotal: string;
      mode: string;
      updatedBy: string;
      notes: string;
    };
  };
  sortingDailyDetails: {
    description: string;
    loading: string;
    loadError: string;
    empty: string;
    title: string;
      printWindowTitle: string;
      expandedPrintWindowTitle: string;
      sheetName: string;
      expandedSheetName: string;
      exportError: string;
      expandedPrintError: string;
      expandedExportError: string;
    closeLabel: string;
    print: string;
    table: {
      category: string;
      quantity: string;
      dailyTotal: string;
      loadingCategoryBreakdown: string;
      grade: string;
      total: string;
      noCategoryBreakdown: string;
    };
    actions: {
      printTableAriaLabel: string;
      printTitle: string;
      exportTableAriaLabel: string;
      exportTitle: string;
      standardDownload: string;
      expandedDownload: string;
    };
    pitamLabels: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
    filters: {
      fieldFilterLabel: string;
      assignmentFilterLabel: string;
      allFieldsOption: string;
      assignmentOptions: {
        all: string;
        trader: string;
        customer: string;
        traderPrefix: string;
        customerPrefix: string;
      };
    };
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      categoriesGroup: string;
      traderTotal: string;
      customerTotal: string;
      totalSorted: string;
    };
  };
  fieldReport: {
    printAriaLabel: string;
    printTitle: string;
    exportAriaLabel: string;
    exportTitle: string;
    printWindowTitle: string;
    sheetName: string;
    exportError: string;
    detailsTitle: (fieldName?: string) => string;
    closeLabel: string;
    printLabel: string;
    headers: {
      recordCount: string;
      differenceRejected: string;
      differenceNet: string;
      differenceRate: string;
    };
  };
  emptyState: Record<string, EmptyStateContent>;
};

export const HARVEST_I18N: Record<'he' | 'en', HarvestI18n> = {
  he: HARVEST_I18N_HE,
  en: HARVEST_I18N_EN,
};
