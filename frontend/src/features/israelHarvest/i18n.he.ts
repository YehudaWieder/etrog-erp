import type { IsraelHarvestI18n } from './i18n';

export const ISRAEL_HARVEST_I18N_HE: IsraelHarvestI18n = {
  pageTitle: 'קטיף א"י',
  settings: 'הגדרות',
  sidebar: [
    {
      id: 'summaries',
      title: 'סיכום',
      href: '/harvest/harvest-summary',
      icon: 'fa-chart-bar',
      items: [
        {
          id: 'harvest-summary',
          label: 'סיכום קטיף (לפי שדות)',
          href: '/harvest/harvest-summary',
          icon: 'fa-lemon',
        },
        {
          id: 'sorting-summary',
          label: 'סיכום מיונים',
          href: '/harvest/sorting-summary',
          icon: 'fa-grip',
        },
      ],
    },
    {
      id: 'harvests',
      title: 'קטיפים',
      href: '/harvest/harvest-daily-details',
      icon: 'fa-lemon',
      items: [
        {
          id: 'harvest-daily-details',
          label: 'פירוט לפי ימים',
          href: '/harvest/harvest-daily-details',
          icon: 'fa-calendar',
        },
      ],
    },
    {
      id: 'sortings',
      title: 'מיונים',
      href: '/harvest/sorting-list',
      icon: 'fa-grip',
      items: [
        {
          id: 'sorting-list',
          label: 'רשימת מיונים',
          href: '/harvest/sorting-list',
          icon: 'fa-list',
        },
      ],
    },
  ],
  emptyState: {
    'harvest-summary': {
      title: 'סיכום קטיף יוצג כאן',
      description: 'כאן יוצג סיכום כלל הקטיפים לפי שדות לעונה הנבחרת.',
    },
    'sorting-summary': {
      title: 'סיכום מיונים יוצג כאן',
      description: 'כאן יוצג סיכום כלל המיונים לפי קטגוריות ועונות.',
    },
    'harvest-daily-details': {
      title: 'פירוט קטיפים לפי ימים יוצג כאן',
      description: 'כאן יוצגו נתוני הקטיף היומיים לעונה הנבחרת.',
    },
    'sorting-list': {
      title: 'רשימת מיונים תוצג כאן',
      description: 'כאן תוצג רשימה מלאה של כל רשומות המיון לעונה הנבחרת.',
    },
    default: {
      title: 'אין נתונים להצגה',
      description: 'בחר פריט מהסרגל הצידי כדי לצפות במידע רלוונטי.',
    },
  },
};
