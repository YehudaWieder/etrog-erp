import type { SettingsI18n } from './settingsPage.types';

export const SETTINGS_I18N_EN: SettingsI18n = {
  userNameFallback: 'My Profile',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting', href: '/harvest/harvest-summary' },
    { id: 'shipments', label: 'Shipments', href: '/shipments/shipment-items-summary' },
    { id: 'partners', label: 'Partners Inventory', icon: 'fa-handshake', href: '/traders' },
    { id: 'customers', label: 'Customers Inventory', icon: 'fa-users' },
    { id: 'workers', label: 'Israel Harvest', icon: 'fa-person', href: '/harvest' },
    { id: 'israel-shipments', label: 'Israel Shipments', icon: 'fa-truck-fast', href: '/shipments/shipment-items-summary' },
    { id: 'israel-inventory', label: 'Israel Inventory', icon: 'fa-warehouse', href: '/inventory' },
    { id: 'israel-payments', label: 'Israel Payments', icon: 'fa-file-invoice-dollar', href: '/payments' },
    { id: 'payments', label: 'Expenses & Payments', icon: 'fa-money-bill' },
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
  setupNotices: {
    1: 'Traders must be added before the system can be used.',
    2: 'After adding traders, default categories must be configured.',
    3: 'After configuring categories, a season must be created.',
  },
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
        { id: 'harvestCartonCapacity', label: 'Carton Capacity', href: '/settings/system/carton-capacity', icon: 'fa-box' },
        { id: 'fields', label: 'Fields', href: '/settings/system/fields', icon: 'fa-grip' },
        { id: 'cartons', label: 'Cartons', href: '/settings/system/cartons', icon: 'fa-box' },
        { id: 'pricing', label: 'Pricing', href: '/settings/system/pricing', icon: 'fa-money-bill' },
        { id: 'defaultTraderCategories', label: 'Default Trader Categories', href: '/settings/system/default-categories', icon: 'fa-bookmark' },
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
        { id: 'traderPricing', label: 'Trader Pricing', href: '/settings/traders/pricing', icon: 'fa-money-bill' },
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
    {
      id: 'israelHarvest',
      title: 'Israel Harvest Settings',
      href: '/settings/sellers-fields',
      icon: 'fa-leaf',
      items: [
        { id: 'harvestSellersFields', label: 'Sellers/Fields', href: '/settings/sellers-fields', icon: 'fa-user-tie' },
        { id: 'harvestSellerCategories', label: 'Seller Categories', href: '/settings/seller-categories', icon: 'fa-tag' },
        { id: 'harvestSortingCategories', label: 'Sorting Categories', href: '/settings/sorting-categories', icon: 'fa-layer-group' },
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
    cartons: {
      title: 'Carton Settings',
      description: 'Set the capacity for each carton size: small (S), medium (M), large (L).',
    },
    pricing: {
      title: 'Pricing Settings',
      description: 'Set the currency and etrog unit price for each season.',
    },
    traders: {
      title: 'Trader Settings',
      description: 'Manage traders in the system, including add, edit, and delete actions.',
    },
    traderCategories: {
      title: 'Trader Categories',
      description: 'Define and organize trader categories (for example: Yanueve, Chazon Ish); each category is created for the active season.',
    },
    traderPricing: {
      title: 'Trader Pricing',
      description: 'Set each trader\'s expense participation percent and flat price per etrog for the selected season.',
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