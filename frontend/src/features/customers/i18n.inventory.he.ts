import type { CustomerInventoryI18n } from './i18n.inventory';

export const CUSTOMER_INVENTORY_I18N_HE: CustomerInventoryI18n = {
  userNameFallback: 'משתמש',
  pageTitle: 'מלאי לקוחות',
  topNav: [
    {
      id: 'customers',
      label: 'מלאי לקוחות',
    },
  ],
  sidebar: [
    {
      id: 'customer-inventory',
      title: 'מלאי לקוחות',
      items: [
        {
          id: 'unboxed',
          label: 'מלאי שלא נארז',
          href: '/customers/unboxed',
          icon: 'fa-inbox',
        },
        {
          id: 'boxed',
          label: 'מלאי שנארז',
          href: '/customers/boxed',
          icon: 'fa-boxes-stacked',
        },
        {
          id: 'shipped',
          label: 'מלאי שנשלח',
          href: '/customers/shipped',
          icon: 'fa-truck-ramp-box',
        },
        {
          id: 'arrived',
          label: 'מלאי שהגיע ליעד',
          href: '/customers/arrived',
          icon: 'fa-circle-check',
        },
      ],
    },
  ],
  emptyState: {
    default: {
      title: 'לא נמצא מלאי',
      description: 'בחר טאב כדי להציג את המלאי הקיים',
    },
    unboxed: {
      title: 'אין מלאי שלא נארז',
      description: 'כל המלאי הקיים כבר נארז או בתהליך עיבוד',
    },
    boxed: {
      title: 'אין מלאי שנארז',
      description: 'כל המלאי הקיים טרם נארז',
    },
    shipped: {
      title: 'אין מלאי שנשלח',
      description: 'כל המלאי הקיים טרם נשלח',
    },
    arrived: {
      title: 'אין מלאי שהגיע ליעד',
      description: 'כל המלאי הקיים טרם הגיע ליעדו',
    },
  },
};
