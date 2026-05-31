import type { SettingsI18n } from './settingsPage.types';

export const SETTINGS_I18N_EN: SettingsI18n = {
  userNameFallback: 'My Profile',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'partners', label: 'Partners Inventory' },
    { id: 'customers', label: 'Customers Inventory' },
    { id: 'workers', label: 'Workers' },
    { id: 'payments', label: 'Expenses & Payments' },
  ],
  pageTitle: 'Settings',
  save: 'Save',
  saved: 'Changes were saved',
  reset: 'Reset',
  languageLabel: 'Language',
  languageOptions: { he: 'Hebrew', en: 'English' },
  colorLabel: 'Colors & Interface',
  colorHint: 'Customize your interface colors. Settings are saved locally in your browser.',
  primaryColorLabel: 'Primary Color',
  accentColorLabel: 'Accent Color',
  textColorLabel: 'Text Color',
  darkModeLabel: 'Dark Mode',
  darkModeOn: 'Dark',
  darkModeOff: 'Light',
  managerOnlyHint: 'This area is visible to managers only.',
  sidebarWorker: [
    {
      id: 'site',
      title: 'Site Settings',
      href: '/settings/site/language',
      icon: 'fa-sliders',
      items: [
        { id: 'language', label: 'Language', href: '/settings/site/language', icon: 'fa-globe' },
        { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color', icon: 'fa-palette' },
      ],
    },
  ],
  sidebarManager: [
    {
      id: 'site',
      title: 'Site Settings',
      href: '/settings/site/language',
      icon: 'fa-sliders',
      items: [
        { id: 'language', label: 'Language', href: '/settings/site/language', icon: 'fa-globe' },
        { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color', icon: 'fa-palette' },
      ],
    },
    {
      id: 'system',
      title: 'System Settings',
      href: '/settings/system/seasons',
      icon: 'fa-cog',
      items: [
        { id: 'seasons', label: 'Seasons', href: '/settings/system/seasons', icon: 'fa-calendar' },
        { id: 'fields', label: 'Fields', href: '/settings/system/fields', icon: 'fa-grip' },
      ],
    },
    {
      id: 'traders',
      title: 'Trader Settings',
      href: '/settings/traders',
      icon: 'fa-handshake',
      items: [
        { id: 'traders', label: 'Traders', href: '/settings/traders', icon: 'fa-handshake' },
        { id: 'traderCategories', label: 'Trader Categories', href: '/settings/traders/categories', icon: 'fa-tag' },
        { id: 'defaultTraderCategories', label: 'Default Trader Categories', href: '/settings/traders/default-categories', icon: 'fa-bookmark' },
      ],
    },
    {
      id: 'customers',
      title: 'Customer Settings',
      href: '/settings/customers',
      icon: 'fa-users',
      items: [
        { id: 'customers', label: 'Customers', href: '/settings/customers', icon: 'fa-users' },
        { id: 'customerCategories', label: 'Customer Categories', href: '/settings/customers/categories', icon: 'fa-tag' },
      ],
    },
  ],
  content: {
    language: {
      title: 'Language Settings',
      description: 'Choose interface language. Change is applied immediately.',
    },
    themeColor: {
      title: 'Color Settings',
      description: 'Select dominant color. Saved as a local user preference.',
    },
    seasons: {
      title: 'Season Management',
      description: 'Manage seasons: create a new season, set the active season, and remove seasons when needed.',
    },
    fields: {
      title: 'Field Management',
      description: 'Manage system field definitions, including creating, editing, and deleting fields.',
    },
    traders: {
      title: 'Trader Settings',
      description: 'Manage traders in the system, including add, edit, and delete actions.',
    },
    traderCategories: {
      title: 'Trader Categories',
      description: 'Define and organize trader categories (for example: Yanueve, Chazon Ish); each category is created for the active season.',
    },
    defaultTraderCategories: {
      title: 'Default Trader Categories',
      description: 'Set default trader categories for all seasons; these categories are created automatically for every new season year that is added.',
    },
    customers: {
      title: 'Customer Settings',
      description: 'Add a new customer to the system; customer setup is not season-dependent.',
    },
    customerCategories: {
      title: 'Customer Category Settings',
      description: 'Manage customer categories for the active season with grade and price.',
    },
  },
};