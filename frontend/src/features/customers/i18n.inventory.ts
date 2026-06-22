import { CUSTOMER_INVENTORY_I18N_HE } from './i18n.inventory.he';
import { CUSTOMER_INVENTORY_I18N_EN } from './i18n.inventory.en';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  badge?: number;
}

export interface SidebarSection {
  id: string;
  title: string;
  icon?: string;
  href?: string;
  badge?: number;
  items: NavItem[];
}

export type CustomerInventoryI18n = {
  userNameFallback: string;
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  summary: {
    focusedExplanation: string;
    filters: {
      seasonLabel: string;
      customerLabel: string;
      allCustomersOption: string;
      inventoryStatusLabel: string;
      allInventoryOption: string;
      unboxedOption: string;
      boxedOption: string;
      shippedOption: string;
      arrivedOption: string;
      selfPickupOption: string;
    };
    loading: string;
    loadFailed: string;
    empty: string;
    retry: string;
    totals: {
      totalQuantity: string;
    };
    matrix: {
      grade: string;
      total: string;
    };
    columns: {
      customer: string;
      category: string;
    };
    breakdown: {
      showBreakdown: string;
      hideBreakdown: string;
      breakdownTitle: string;
    };
    values: {
      none: string;
      pitamStatus: {
        WITH_PITAM: string;
        WITHOUT_PITAM: string;
        MIXED: string;
      };
    };
  };
  movements: {
    addMovementButton: string;
    columns: {
      date: string;
      type: string;
      customer: string;
      category: string;
      grade: string;
      pitamStatus: string;
      quantity: string;
    };
    filters: {
      title: string;
      seasonLabel: string;
      customerLabel: string;
      allCustomersOption: string;
      movementStatusLabel: string;
      allMovementsOption: string;
      nonShipmentMovementsOption: string;
      shipmentMovementsOption: string;
      categoryLabel: string;
      allCategoriesOption: string;
      gradeLabel: string;
      allGradesOption: string;
      pitamStatusLabel: string;
      allPitamStatusesOption: string;
    };
    movementTypes: Record<string, string>;
    pitamStatuses: Record<string, string>;
    summary: {
      totalInventory: string;
      notPacked: string;
      packed: string;
    };
    loading: string;
    error: string;
    retry: string;
    empty: string;
    noMatchingFilters: string;
    tableActionsLabel: string;
    printAriaLabel: string;
    printTitle: string;
    exportAriaLabel: string;
    exportTitle: string;
  };
  emptyState: Record<string, { title: string; description: string }>;
};

export const CUSTOMER_INVENTORY_I18N = {
  he: CUSTOMER_INVENTORY_I18N_HE,
  en: CUSTOMER_INVENTORY_I18N_EN,
} as const;
