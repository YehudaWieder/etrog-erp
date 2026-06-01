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
  emptyState: Record<string, { title: string; description: string }>;
};

export const CUSTOMER_INVENTORY_I18N = {
  he: CUSTOMER_INVENTORY_I18N_HE,
  en: CUSTOMER_INVENTORY_I18N_EN,
} as const;
