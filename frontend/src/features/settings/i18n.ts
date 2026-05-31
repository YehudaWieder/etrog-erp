import type { Lang, SettingsI18n } from './settingsPage.types';

export const SETTINGS_I18N: Record<Lang, SettingsI18n> = {
  he: {
    topNav: [
      { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
      { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
      { id: 'partners', label: 'מלאי סוחרים', icon: 'fa-handshake' },
      { id: 'customers', label: 'מלאי לקוחות', icon: 'fa-users' },
      { id: 'workers', label: 'עובדים', icon: 'fa-person' },
      { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
    ],
    pageTitle: 'הגדרות',
    save: 'שמירה',
    saved: 'השינויים נשמרו',
    reset: 'אתחול',
    languageLabel: 'שפה',
    languageOptions: { he: 'עברית', en: 'English' },
    colorLabel: 'צבעים וממשק',
    colorHint: 'בחר את צבעי הממשק שלך. הגדרות נשמרות בדפדפן.',
    primaryColorLabel: 'צבע ראשי',
    accentColorLabel: 'צבע accent',
    textColorLabel: 'צבע טקסט',
    darkModeLabel: 'מוד כהה',
    darkModeOn: 'כהה',
    darkModeOff: 'בהיר',
    managerOnlyHint: 'תוכן זה זמין למנהל מערכת.',
    sidebarWorker: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
    ],
    sidebarManager: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
      {
        id: 'system',
        title: 'הגדרות מערכת',
        href: '/settings/system/seasons',
        icon: 'fa-cog',
        items: [
          { id: 'seasons', label: 'עונות', href: '/settings/system/seasons', icon: 'fa-calendar' },
          { id: 'fields', label: 'שדות', href: '/settings/system/fields', icon: 'fa-grip' },
        ],
      },
      {
        id: 'traders',
        title: 'הגדרות סוחרים',
        href: '/settings/traders',
        icon: 'fa-handshake',
        items: [
          { id: 'traders', label: 'סוחרים', href: '/settings/traders', icon: 'fa-handshake' },
          { id: 'traderCategories', label: 'קטגוריות סוחרים', href: '/settings/traders/categories', icon: 'fa-tag' },
          { id: 'defaultTraderCategories', label: 'קטגוריות סוחרים ברירת מחדל', href: '/settings/traders/default-categories', icon: 'fa-bookmark' },
        ],
      },
      {
        id: 'customers',
        title: 'הגדרות לקוחות',
        href: '/settings/customers',
        icon: 'fa-users',
        items: [
          { id: 'customers', label: 'לקוחות', href: '/settings/customers', icon: 'fa-users' },
          { id: 'customerCategories', label: 'קטגוריות לקוחות', href: '/settings/customers/categories', icon: 'fa-tag' },
        ],
      },
    ],
    content: {
      language: {
        title: 'הגדרות שפה',
        description: 'בחר שפת ממשק. השינוי מתעדכן מיידית ונשמר בדפדפן.',
      },
      themeColor: {
        title: 'הגדרות צבע',
        description: 'בחר צבע דומיננטי. הצבע נשמר מקומית כהעדפת משתמש.',
      },
      seasons: {
        title: 'ניהול עונות',
        description: 'נהל עונות: צור עונה חדשה, בחר עונה פעילה ומחק עונות לפי הצורך.',
      },
      fields: {
        title: 'ניהול שדות',
        description: 'נהל את רשימת השדות במערכת, כולל הוספה, עריכה ומחיקה.',
      },
      traders: {
        title: 'הגדרות סוחרים',
        description: 'נהל סוחרים במערכת: הוסף, עדכן ומחק לפי הצורך.',
      },
      traderCategories: {
        title: 'קטגוריות סוחרים',
        description: 'הגדר וארגן קטגוריות לסוחרים (לדוגמה: יאנעווע, חזו"א); כל קטגוריה נוצרת לעונה הפעילה.',
      },
      defaultTraderCategories: {
        title: 'קטגוריות סוחרים ברירת מחדל',
        description: 'הגדר קטגוריות ברירת מחדל לכל העונות; הקטגוריות האלה נוצרות אוטומטית לכל עונת שנה חדשה שנוספת.',
      },
      customers: {
        title: 'הגדרות לקוחות',
        description: 'הוסף פרטי לקוח חדש למערכת.',
      },
      customerCategories: {
        title: 'הגדרת קטגוריות לקוחות',
        description: 'נהל קטגוריות לקוח לעונה הפעילה עם דרגה ומחיר.',
      },
    },
  },
  en: {
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
  },
};

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

export function getSettingsI18n(lang: Lang): SettingsI18n {
  return SETTINGS_I18N[lang];
}

export function isManagerRole(role: string | undefined): boolean {
  return MANAGER_ROLES.has((role || '').trim().toLowerCase());
}

export function getSettingsHeaderActionText(lang: Lang): {
  activate: string;
  remove: string;
  edit: string;
  add: string;
} {
  return {
    activate: lang === 'he' ? 'הגדר כפעילה' : 'Set Active',
    remove: lang === 'he' ? 'מחיקה' : 'Delete',
    edit: lang === 'he' ? 'עריכה' : 'Edit',
    add: lang === 'he' ? 'חדש' : 'New',
  };
}
