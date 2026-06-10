import type { NavItem, SidebarSection } from '../../types/navigation';

export type Lang = 'he' | 'en';

export type SettingsChildKey =
  | 'language'
  | 'themeColor'
  | 'seasons'
  | 'fields'
  | 'cartons'
  | 'pricing'
  | 'traders'
  | 'traderCategories'
  | 'defaultTraderCategories'
  | 'customers'
  | 'customerCategories';

export type SettingsContent = {
  title: string;
  description: string;
};

export type SettingsI18n = {
  userNameFallback: string;
  topNav: NavItem[];
  pageTitle: string;
  save: string;
  saved: string;
  reset: string;
  languageLabel: string;
  languageOptions: { he: string; en: string };
  colorLabel: string;
  colorHint: string;
  primaryColorLabel: string;
  accentColorLabel: string;
  textColorLabel: string;
  darkModeLabel: string;
  darkModeOn: string;
  darkModeOff: string;
  managerOnlyHint: string;
  sidebarWorker: SidebarSection[];
  sidebarManager: SidebarSection[];
  content: Record<SettingsChildKey, SettingsContent>;
};