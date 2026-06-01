import type { CustomerInventoryI18n } from './i18n.inventory';

export const CUSTOMER_INVENTORY_I18N_EN: CustomerInventoryI18n = {
  userNameFallback: 'My Profile',
  pageTitle: 'Customers Inventory',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting', icon: 'fa-leaf' },
    { id: 'shipments', label: 'Shipments', icon: 'fa-truck' },
    { id: 'traders', label: 'Partners Inventory', icon: 'fa-handshake' },
    { id: 'customers', label: 'Customers Inventory', icon: 'fa-users' },
    { id: 'workers', label: 'Workers', icon: 'fa-person' },
    { id: 'payments', label: 'Expenses & Payments', icon: 'fa-money-bill' },
  ],
  sidebar: [
    {
      id: 'customer-inventory',
      title: 'Customers Inventory',
      href: '/customers/unboxed',
      icon: 'fa-users',
      items: [
        {
          id: 'unboxed',
          label: 'Unboxed Inventory',
          href: '/customers/unboxed',
          icon: 'fa-inbox',
        },
        {
          id: 'boxed',
          label: 'Boxed Inventory',
          href: '/customers/boxed',
          icon: 'fa-boxes-stacked',
        },
        {
          id: 'shipped',
          label: 'Shipped Inventory',
          href: '/customers/shipped',
          icon: 'fa-truck-ramp-box',
        },
        {
          id: 'arrived',
          label: 'Arrived Inventory',
          href: '/customers/arrived',
          icon: 'fa-circle-check',
        },
      ],
    },
  ],
  emptyState: {
    default: {
      title: 'No Inventory Found',
      description: 'Select a tab to view available inventory',
    },
    unboxed: {
      title: 'No Unboxed Inventory',
      description: 'All available inventory has been boxed or is being processed',
    },
    boxed: {
      title: 'No Boxed Inventory',
      description: 'All available inventory has not yet been boxed',
    },
    shipped: {
      title: 'No Shipped Inventory',
      description: 'All available inventory has not yet been shipped',
    },
    arrived: {
      title: 'No Arrived Inventory',
      description: 'All available inventory has not yet reached its destination',
    },
  },
};
