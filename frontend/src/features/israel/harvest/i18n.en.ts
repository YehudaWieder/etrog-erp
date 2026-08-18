import type { IsraelHarvestI18n } from './i18n';

export const ISRAEL_HARVEST_I18N_EN: IsraelHarvestI18n = {
  pageTitle: 'Israel Harvest',
  settings: 'Settings',
  sidebar: [
    {
      id: 'summaries',
      title: 'Summary',
      href: '/harvest/harvest-summary',
      icon: 'fa-chart-bar',
      items: [
        {
          id: 'harvest-summary',
          label: 'Harvest Summary (by fields)',
          href: '/harvest/harvest-summary',
          icon: 'fa-lemon',
        },
        {
          id: 'sorting-summary',
          label: 'Sorting Summary',
          href: '/harvest/sorting-summary',
          icon: 'fa-grip',
        },
      ],
    },
    {
      id: 'harvests',
      title: 'Harvests',
      href: '/harvest/harvest-daily-details',
      icon: 'fa-lemon',
      items: [
        {
          id: 'harvest-daily-details',
          label: 'Daily Breakdown',
          href: '/harvest/harvest-daily-details',
          icon: 'fa-calendar',
        },
      ],
    },
    {
      id: 'sortings',
      title: 'Sortings',
      href: '/harvest/sorting-list',
      icon: 'fa-grip',
      items: [
        {
          id: 'sorting-list',
          label: 'Sorting List',
          href: '/harvest/sorting-list',
          icon: 'fa-list',
        },
      ],
    },
  ],
  pageControls: {
    addHarvest: 'Add Harvest',
    addSorting: 'Add Sorting',
  },
  sortingForm: {
    ariaLabel: 'Sorting form',
    closeLabel: 'Close',
    title: 'Add Sorting',
    instructions:
      'Use this form to create a sorting record for an existing harvest.',
    harvestLabel: 'Linked harvest',
    harvestPlaceholder: 'Select harvest',
    dateGregorianLabel: 'Gregorian date',
    dateHebrewLabel: 'Hebrew date',
    quantityLabel: 'Total harvested',
    classifiedTotalLabel: 'Total sorted',
    remainingLabel: 'Remaining to sort',
    selectHarvestHint: 'Select a harvest to continue.',
    loadingExistingClassifications: 'Loading existing sortings...',
    alreadyFullySortedMessage: 'This harvest has already been fully sorted.',
    harvestRequiredError: 'Please select the harvest this sorting belongs to.',
    save: 'Save sorting',
    saving: 'Saving...',
    saveFailedError: 'Failed to save the sorting. Please try again.',
  },
  harvestForm: {
    ariaLabel: 'Harvest form',
    closeLabel: 'Close',
    title: 'Add Harvest and Sorting',
    instructions:
      'Use this form to enter harvest data, and add sorting rows if needed.',
    fieldLabel: 'Field',
    fieldPlaceholder: 'Select field',
    gregorianDateLabel: 'Gregorian date',
    hebrewDateLabel: 'Hebrew date',
    quantityLabel: 'Quantity',
    quantityPlaceholder: 'Quantity',
    notesLabel: 'Notes',
    notesPlaceholder: 'Harvest notes',
    classificationModeLabel: 'Classification mode',
    classificationModeHint:
      'Choose the sorting mode: full if the whole harvested quantity is sorted and entered in this form, or partial for available data.',
    fullSorting: 'Full sorting',
    partialSorting: 'Partial sorting',
    sortingRowsTitle: 'Sorting rows',
    addSortingRow: 'Add sorting row',
    removeSortingRow: 'Remove',
    sortingRowPrefix: (index) => `Sorting ${index + 1}`,
    fieldCategoryLabel: 'Seller category',
    fieldCategoryPlaceholder: 'Select seller category',
    categoryLabel: 'Sort category',
    categoryPlaceholder: 'Select category',
    pitamStatusLabel: 'Pitam',
    pitamOptions: {
      withPitam: 'With pitam',
      withoutPitam: 'Without pitam',
      mixed: 'Mixed',
    },
    quantityMatrixQuantityHeader: 'Quantity',
    selectFieldCategoryFirstHint: 'Select a seller category first.',
    selectCategoryForQuantitiesHint:
      'Select a sort category to fill in quantities per grade.',
    sortingNotesLabel: 'Sorting notes',
    sortingNotesPlaceholder: 'Sorting notes',
    sortingTotalQuantityLabel: 'Total sorting quantity',
    fullSortingRequiredHint: (requiredTotal) =>
      `Full sorting requires a quantity of ${requiredTotal}.`,
    fullSortingReduceHint: (amount) =>
      `You filled more than required - reduce by ${amount}.`,
    fullSortingIncreaseHint: (amount) =>
      `You filled less than required - add ${amount}.`,
    fullSortingMatchHint: 'The filled quantity matches full sorting.',
    duplicateSortingRowError:
      'This category was already selected in another sorting row.',
    addSortingRowBlockedError:
      'Complete the last sorting row before adding a new one.',
    cancel: 'Cancel',
    save: 'Save harvest',
    saving: 'Saving...',
    fieldRequiredError: 'Please select a field.',
    gregorianDateRequiredError: 'Please provide a valid Gregorian date.',
    quantityRequiredError: 'Please enter a quantity greater than zero.',
    sortingTotalMustMatchAvailableForFullSorting: (requiredTotal) =>
      `In full sorting mode, total sorting quantity must be exactly ${requiredTotal}. You can switch to partial sorting to save.`,
    sortingTotalMustBeLessForPartialSorting: (requiredTotal) =>
      `In partial sorting mode, total sorting quantity must be less than ${requiredTotal}.`,
    saveFailedError: 'Failed to save the harvest. Please try again.',
    sortingSaveFailedError:
      'The harvest was saved, but some sorting rows failed to save. You can add them via "Add Sorting".',
  },
  fieldReport: {
    description:
      'Centralized harvest records by field for the selected season.',
    loading: 'Loading harvest data...',
    loadError: 'Failed to load harvest data right now.',
    empty: 'No harvest records found for the selected season.',
    tableActionsLabel: 'Table actions',
    printTitle: 'Print',
    printAriaLabel: 'Print field report table',
    exportTitle: 'Export to Excel',
    exportAriaLabel: 'Export field report to Excel',
    exportError: 'Could not export to Excel right now.',
    printWindowTitle: 'Harvest Field Report',
    sheetName: 'Field Report',
    seasonFilterLabel: 'Filter by season',
    summary: {
      totalQuantity: 'Total Harvested',
      totalRecordCount: 'Total Harvests',
      totalFields: 'Total Fields',
      avgQuantityPerHarvest: 'Avg. per Harvest',
    },
    columns: {
      fieldName: 'Field',
      recordCount: 'Harvests',
      totalQuantity: 'Total Harvested',
      avgQuantityPerHarvest: 'Avg. per Harvest',
    },
  },
  emptyState: {
    'harvest-summary': {
      title: 'Harvest summary will appear here',
      description:
        'A summary of all harvests by field for the selected season will be shown here.',
    },
    'sorting-summary': {
      title: 'Sorting summary will appear here',
      description:
        'An overview of all sortings by category and season will be shown here.',
    },
    'harvest-daily-details': {
      title: 'Daily harvest breakdown will appear here',
      description:
        'Daily harvest data for the selected season will be shown here.',
    },
    'sorting-list': {
      title: 'Sorting list will appear here',
      description:
        'A full list of all sorting records for the selected season will be shown here.',
    },
    default: {
      title: 'No data to display',
      description: 'Select a sidebar item to view relevant information.',
    },
  },
};
