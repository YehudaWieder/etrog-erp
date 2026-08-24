import type { SidebarSection } from '../../../types/navigation';
import { ISRAEL_INVENTORY_I18N_EN } from './i18n.en';
import { ISRAEL_INVENTORY_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type IsraelInventoryI18n = {
  pageTitle: string;
  settings: string;
  sidebar: SidebarSection[];
  emptyState: Record<string, EmptyStateContent> & {
    default: EmptyStateContent;
  };
  allInventory: {
    description: string;
    loading: string;
    empty: string;
    loadError: string;
    retry: string;
    seasonFilterLabel: string;
    fieldFilterLabel: string;
    allFieldsOption: string;
    statusFilterLabel: string;
    statusOptions: {
      all: string;
      notPacked: string;
      packed: string;
      sent: string;
      selfPickup: string;
      waste: string;
    };
    tableTitle: string;
    noGradeLabel: string;
    totals: {
      totalQuantity: string;
    };
    columns: {
      category: string;
      withPitam: string;
      withoutPitam: string;
      mixed: string;
      total: string;
    };
    printTitle: string;
    printAriaLabel: string;
    exportTitle: string;
    exportAriaLabel: string;
    tableActionsLabel: string;
    filtersTitle: string;
  };
  movements: {
    description: string;
    loading: string;
    empty: string;
    loadError: string;
    retry: string;
    noMatchingFilters: string;
    seasonFilterLabel: string;
    fieldFilterLabel: string;
    allFieldsOption: string;
    categoryFilterLabel: string;
    allCategoriesOption: string;
    movementStatusFilterLabel: string;
    movementStatusOptions: {
      all: string;
      nonShipment: string;
      shipment: string;
    };
    gradeFilterLabel: string;
    allGradesOption: string;
    pitamStatusFilterLabel: string;
    allPitamStatusesOption: string;
    filtersTitle: string;
    movementTypes: {
      HARVEST_IN: string;
      PACKED_SHIPPED: string;
      SELF_PICKUP: string;
      WASTE: string;
      ADJUSTMENT: string;
    };
    pitamStatuses: {
      WITH_PITAM: string;
      WITHOUT_PITAM: string;
      MIXED: string;
    };
    columns: {
      date: string;
      type: string;
      field: string;
      category: string;
      grade: string;
      pitamStatus: string;
      quantity: string;
    };
    summary: {
      totalInventory: string;
      notPacked: string;
      packed: string;
    };
    printTitle: string;
    printAriaLabel: string;
    exportTitle: string;
    exportAriaLabel: string;
    tableActionsLabel: string;
  };
  addMovement: {
    buttonLabel: string;
    modalTitle: string;
    typeLabel: string;
    chooseTypeLabel: string;
    typeSectionLabel: string;
    backLabel: string;
    typeOptions: {
      selfPickup: string;
      waste: string;
    };
    fieldLabel: string;
    fieldPlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    gradeLabel: string;
    gradePlaceholder: string;
    pitamStatusLabel: string;
    pitamStatusPlaceholder: string;
    pitamOptions: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
    quantityLabel: string;
    availableQuantityHint: (quantity: number) => string;
    quantityExceedsAvailableError: (available: number) => string;
    validationRequiredError: string;
    notesLabel: string;
    cancel: string;
    save: string;
    saving: string;
    saveFailedError: string;
    nonActiveSeasonDisabled: string;
  };
};

export const ISRAEL_INVENTORY_I18N: Record<'he' | 'en', IsraelInventoryI18n> = {
  he: ISRAEL_INVENTORY_I18N_HE,
  en: ISRAEL_INVENTORY_I18N_EN,
};
