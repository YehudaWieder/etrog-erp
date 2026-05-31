export const SHIPMENTS_I18N_EN = {
  userNameFallback: 'My Profile',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'partners', label: 'Partners Inventory' },
    { id: 'customers', label: 'Customers Inventory' },
    { id: 'workers', label: 'Workers' },
    { id: 'payments', label: 'Expenses & Payments' },
  ],
  sidebar: [
    {
      id: 'all-shipments',
      title: 'All Shipments',
      href: '/shipments/all-shipments',
      items: [
        { id: 'packaging', label: 'Shipments In Packaging', badge: 2, href: '/shipments/packaging' },
        { id: 'completed', label: 'Completed Shipments', href: '/shipments/completed' },
      ],
    },
    {
      id: 'all-boxes',
      title: 'All Boxes',
      href: '/shipments/all-boxes',
      items: [
        { id: 'not-sent-boxes', label: 'Boxes Not Sent', href: '/shipments/not-sent-boxes' },
        { id: 'sent-boxes', label: 'Sent Boxes', href: '/shipments/sent-boxes' },
        { id: 'closed-boxes', label: 'Closed Boxes', href: '/shipments/closed-boxes' },
        { id: 'open-boxes', label: 'Open Boxes', href: '/shipments/open-boxes' },
      ],
    },
    {
      id: 'shipment-items',
      title: 'Shipment Items',
      href: '/shipments/shipment-items',
      items: [
        { id: 'sent-items', label: 'Sent Items', href: '/shipments/sent-items' },
        { id: 'pending-items', label: 'Items Not Sent', href: '/shipments/pending-items' },
      ],
    },
  ],
  pageTitle: 'All Shipments',
  actionSelected: (label: string) => `Action selected: ${label}`,
  emptyState: {
    packaging: {
      title: 'No shipments in packaging',
      description: 'Click "New Shipment" to add shipments.',
    },
    completed: {
      title: 'No completed shipments',
      description: 'When you finish packaging and shipping, records will appear here.',
    },
    'not-sent-boxes': {
      title: 'No boxes not sent',
      description: 'Open a new box to start assigning items.',
    },
    'sent-boxes': {
      title: 'No boxes sent',
      description: 'Boxes already shipped will appear here.',
    },
    'closed-boxes': {
      title: 'No closed boxes',
      description: 'Close active boxes to see them here.',
    },
    'open-boxes': {
      title: 'No open boxes',
      description: 'Open a new box to start packing.',
    },
    'sent-items': {
      title: 'No items sent',
      description: 'All items sent to customers will appear here.',
    },
    'pending-items': {
      title: 'No items pending shipment',
      description: 'When new items are entered, they will appear here.',
    },
    default: {
      title: 'No data to display',
      description: 'Select a sidebar item to see relevant info.',
    },
  },
  addItem: 'Add Item',
  addBox: 'Add Box',
  addShipment: 'Add Shipment',
  settings: 'Settings',
};