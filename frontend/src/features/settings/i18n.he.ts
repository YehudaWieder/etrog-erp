import type { SettingsI18n } from './settingsPage.types';

export const SETTINGS_I18N_HE: SettingsI18n = {
  userNameFallback: 'הפרופיל שלי',
  topNav: [
    { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf', href: '/harvest/harvest-summary' },
    { id: 'shipments', label: 'משלוחים', icon: 'fa-truck', href: '/shipments/shipment-items-summary' },
    { id: 'partners', label: 'מלאי סוחרים', icon: 'fa-handshake', href: '/traders' },
    { id: 'customers', label: 'מלאי לקוחות', icon: 'fa-users' },
    { id: 'workers', label: 'קטיף א"י', icon: 'fa-person', href: '/harvest' },
    { id: 'israel-shipments', label: 'משלוחים א"י', icon: 'fa-truck-fast', href: '/shipments' },
    { id: 'israel-inventory', label: 'מלאי א"י', icon: 'fa-warehouse', href: '/inventory' },
    { id: 'israel-payments', label: 'הוצאות ותשלומים א"י', icon: 'fa-file-invoice-dollar', href: '/payments' },
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
  setupNotices: {
    1: 'לפני שניתן להשתמש במערכת יש להוסיף סוחרים.',
    2: 'לאחר הוספת הסוחרים יש להגדיר קטגוריות ברירת מחדל.',
    3: 'לאחר הגדרת הקטגוריות יש ליצור עונה.',
  },
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
        { id: 'cartons', label: 'קרטונים', href: '/settings/system/cartons', icon: 'fa-box' },
        { id: 'pricing', label: 'מחירים', href: '/settings/system/pricing', icon: 'fa-money-bill' },
        { id: 'defaultTraderCategories', label: 'קטגוריות סוחרים ברירת מחדל', href: '/settings/system/default-categories', icon: 'fa-bookmark' },
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
        { id: 'traderPricing', label: 'תמחור סוחרים', href: '/settings/traders/pricing', icon: 'fa-money-bill' },
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
    {
      id: 'israelHarvest',
      title: 'הגדרות קטיף א"י',
      href: '/settings/sellers-fields',
      icon: 'fa-leaf',
      items: [
        { id: 'harvestSellersFields', label: 'מוכרים/שדות', href: '/settings/sellers-fields', icon: 'fa-user-tie' },
        { id: 'harvestSellerCategories', label: 'קטגוריות מוכר', href: '/settings/seller-categories', icon: 'fa-tag' },
        { id: 'harvestSortingCategories', label: 'קטגוריות מיון', href: '/settings/sorting-categories', icon: 'fa-layer-group' },
        { id: 'harvestCategoryGrades', label: 'דרגות לקטגוריות', href: '/settings/grades', icon: 'fa-star' },
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
    cartons: {
      title: 'הגדרות קרטונים',
      description: 'הגדר את קיבולת הקרטונים: קטן (S), בינוני (M), גדול (L).',
    },
    pricing: {
      title: 'הגדרות מחיר',
      description: 'הגדר מטבע ומחיר אתרוג לכל עונה.',
    },
    traders: {
      title: 'הגדרות סוחרים',
      description: 'נהל סוחרים במערכת: הוסף, עדכן ומחק לפי הצורך.',
    },
    traderCategories: {
      title: 'קטגוריות סוחרים',
      description: 'הגדר וארגן קטגוריות לסוחרים (לדוגמה: יאנעווע, חזו"א); כל קטגוריה נוצרת לעונה הפעילה.',
    },
    traderPricing: {
      title: 'תמחור סוחרים',
      description: 'הגדר לכל סוחר אחוז השתתפות בהוצאות ומחיר אחיד לאתרוג עבור העונה הנבחרת.',
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
};