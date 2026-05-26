import type { NavItem, SidebarSection } from '../../types/navigation';

type EmptyStateContent = {
  title: string;
  description: string;
};

type HarvestI18n = {
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  emptyState: Record<string, EmptyStateContent>;
};

export const HARVEST_I18N: Record<'he' | 'en', HarvestI18n> = {
  he: {
    topNav: [
      { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
      { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
      { id: 'partners', label: 'סוחרים', icon: 'fa-handshake' },
      { id: 'customers', label: 'לקוחות', icon: 'fa-users' },
      { id: 'workers', label: 'עובדים', icon: 'fa-person' },
      { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
    ],
    sidebar: [
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
          {
            id: 'harvest-field-report',
            label: 'דוח קטיפים לפי שדה',
            href: '/harvest/harvest-field-report',
            icon: 'fa-bookmark',
          },
        ],
      },
      {
        id: 'sortings',
        title: 'מיונים',
        href: '/harvest/sorting-daily-details',
        icon: 'fa-grip',
        items: [
          {
            id: 'sorting-daily-details',
            label: 'פירוט לפי ימים',
            href: '/harvest/sorting-daily-details',
            icon: 'fa-calendar',
          },
        ],
      },
    ],
    pageTitle: 'קטיף ומיון',
    settings: 'הגדרות',
    emptyState: {
      'harvest-daily-details': {
        title: 'פירוט קטיפים לפי ימים יוצג כאן',
        description: 'בחר טווח תאריכים כדי לצפות בנתוני הקטיף היומיים.',
      },
      'harvest-field-report': {
        title: 'דוח קטיפים לפי שדה יוצג כאן',
        description: 'כאן תוכל לראות פילוח ביצועי קטיף לפי שדות.',
      },
      'sorting-daily-details': {
        title: 'פירוט מיונים לפי ימים יוצג כאן',
        description: 'כאן יוצגו נתוני מיון יומיים לפי תאריך ותפוקה.',
      },
      default: {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהסרגל הצידי כדי לצפות במידע רלוונטי.',
      },
    },
  },
  en: {
    topNav: [
      { id: 'harvest', label: 'Harvest & Sorting' },
      { id: 'shipments', label: 'Shipments' },
      { id: 'partners', label: 'Partners' },
      { id: 'customers', label: 'Customers' },
      { id: 'workers', label: 'Workers' },
      { id: 'payments', label: 'Expenses & Payments' },
    ],
    sidebar: [
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
          {
            id: 'harvest-field-report',
            label: 'Harvest Report By Field',
            href: '/harvest/harvest-field-report',
            icon: 'fa-bookmark',
          },
        ],
      },
      {
        id: 'sortings',
        title: 'Sortings',
        href: '/harvest/sorting-daily-details',
        icon: 'fa-grip',
        items: [
          {
            id: 'sorting-daily-details',
            label: 'Daily Breakdown',
            href: '/harvest/sorting-daily-details',
            icon: 'fa-calendar',
          },
        ],
      },
    ],
    pageTitle: 'Harvest & Sorting',
    settings: 'Settings',
    emptyState: {
      'harvest-daily-details': {
        title: 'Daily harvest breakdown will appear here',
        description: 'Select a date range to view daily harvest activity.',
      },
      'harvest-field-report': {
        title: 'Harvest report by field will appear here',
        description: 'Use this view to compare harvest performance across fields.',
      },
      'sorting-daily-details': {
        title: 'Daily sorting breakdown will appear here',
        description: 'Daily sorting output and status will be shown here.',
      },
      default: {
        title: 'No data to display',
        description: 'Select a sidebar item to view relevant information.',
      },
    },
  },
};
