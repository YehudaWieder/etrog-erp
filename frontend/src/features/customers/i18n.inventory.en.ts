import type { CustomerInventoryI18n } from './i18n.inventory';

export const CUSTOMER_INVENTORY_I18N_EN: CustomerInventoryI18n = {
  userNameFallback: 'My Profile',
  pageTitle: 'Customers Inventory',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting', icon: 'fa-leaf', href: '/harvest/harvest-summary' },
    { id: 'shipments', label: 'Shipments', icon: 'fa-truck', href: '/shipments/shipment-items-summary' },
    { id: 'traders', label: 'Partners Inventory', icon: 'fa-handshake' },
    { id: 'customers', label: 'Customers Inventory', icon: 'fa-users' },
    { id: 'workers', label: 'Workers', icon: 'fa-person' },
    { id: 'payments', label: 'Expenses & Payments', icon: 'fa-money-bill' },
  ],
  sidebar: [
    {
      id: 'customer-inventory',
      title: 'Customers Inventory',
      href: '/customers/all',
      icon: 'fa-users',
      items: [
        {
          id: 'all',
          label: 'All Inventory',
          href: '/customers/all',
          icon: 'fa-box',
        },
      ],
    },
    {
      id: 'fruit-inventory-movements',
      title: 'Inventory Movements Details',
      href: '/customers/movements',
      icon: 'fa-arrows-spin',
      items: [
        {
          id: 'movements',
          label: 'All Inventory Movements',
          href: '/customers/movements',
          icon: 'fa-list',
        },
      ],
    },
  ],
  summary: {
    focusedExplanation: 'Customer inventory summary grouped by category, grade, and pitam status.',
    filters: {
      seasonLabel: 'Year',
      customerLabel: 'Customer',
      allCustomersOption: 'All customers',
      inventoryStatusLabel: 'Inventory Status',
      allInventoryOption: 'All Inventory',
      unboxedOption: 'Unboxed',
      boxedOption: 'Boxed',
      shippedOption: 'Shipped',
      arrivedOption: 'Arrived',
      selfPickupOption: 'Self-Pickup',
    },
    loading: 'Loading customer inventory summary...',
    loadFailed: 'Failed to load customer inventory summary.',
    empty: 'No customer inventory records found.',
    retry: 'Retry',
    totals: {
      totalQuantity: 'Total Customer Inventory',
    },
    matrix: {
      grade: 'Grade',
      total: 'Total',
    },
    columns: {
      customer: 'Customer',
    },
    breakdown: {
      showBreakdown: 'Show breakdown by category',
      hideBreakdown: 'Hide breakdown',
      breakdownTitle: 'Breakdown by customer and category',
    },
    values: {
      none: 'None',
      pitamStatus: {
        WITH_PITAM: 'With pitam',
        WITHOUT_PITAM: 'Without pitam',
        MIXED: 'Mixed',
      },
    },
  },
  movements: {
    addMovementButton: 'Add Movement',
    columns: {
      date: 'Date',
      type: 'Movement Type',
      customer: 'Customer',
      category: 'Category',
      grade: 'Grade',
      pitamStatus: 'Pitam Status',
      quantity: 'Quantity',
    },
    filters: {
      title: 'Active Filters',
      seasonLabel: 'Season',
      customerLabel: 'Customer',
      allCustomersOption: 'All Customers',
      movementStatusLabel: 'Movement Type',
      allMovementsOption: 'All Movements',
      nonShipmentMovementsOption: 'Without Shipment Movements',
      shipmentMovementsOption: 'Shipment Movements Only',
      categoryLabel: 'Category',
      allCategoriesOption: 'All Categories',
      gradeLabel: 'Grade',
      allGradesOption: 'All Grades',
      pitamStatusLabel: 'Pitam Status',
      allPitamStatusesOption: 'All Pitam Statuses',
    },
    movementTypes: {
      HARVEST_IN: 'Harvest In',
      INTERNAL_TRANSFER: 'Internal Transfer',
      OWNERSHIP_TRANSFER: 'Ownership Transfer',
      ASSIGNED: 'Assigned',
      PACKED_SHIPPED: 'Packed & Shipped',
      SELF_PICKUP: 'Self Pickup',
      WASTE: 'Waste',
      ADJUSTMENT: 'Adjustment',
    },
    pitamStatuses: {
      WITH_PITAM: 'With pitam',
      WITHOUT_PITAM: 'Without pitam',
      MIXED: 'Mixed',
    },
    summary: {
      totalInventory: 'Total Inventory',
      notPacked: 'Total Unpacked',
      packed: 'Total Packed',
    },
    loading: 'Loading customer movements...',
    error: 'Error loading customer movements.',
    retry: 'Retry',
    empty: 'No customer movements found.',
    noMatchingFilters: 'No movements match the selected filters.',
    tableActionsLabel: 'Actions',
    printAriaLabel: 'Print table',
    printTitle: 'Print',
    exportAriaLabel: 'Export to Excel',
    exportTitle: 'Export to Excel',
  },
  emptyState: {
    default: {
      title: 'No Inventory Found',
      description: 'Select a tab to view available inventory',
    },
    all: {
      title: 'No inventory to display',
      description: 'All inventory types will appear here',
    },
    movements: {
      title: 'No inventory movements to display',
      description: 'All inventory movements will appear here',
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
    'self-pickup': {
      title: 'No Self-Pickup Inventory',
      description: 'All available inventory has not yet been marked for self-pickup',
    },
  },
};
