export const SHIPMENTS_I18N = {
  he: {
    topNav: [
      { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
      { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
      { id: 'partners', label: 'סוחרים', icon: 'fa-handshake' },
      { id: 'customers', label: 'לקוחות', icon: 'fa-users' },
      { id: 'workers', label: 'עובדים', icon: 'fa-person' },
      { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
      { id: 'seasons', label: 'עונות', icon: 'fa-calendar-days' },
    ],
    sidebar: [
      {
        id: 'all-shipments',
        title: 'כל המשלוחים',
        href: '/shipments/all-shipments',
        icon: 'fa-truck',
        items: [
          { id: 'packaging', label: 'משלוחים באריזה', badge: 2, href: '/shipments/packaging', icon: 'fa-box-open' },
          { id: 'completed', label: 'משלוחים שהושלמו', href: '/shipments/completed', icon: 'fa-circle-check' },
        ],
      },
      {
        id: 'all-boxes',
        title: 'כל הקרטונים',
        href: '/shipments/all-boxes',
        icon: 'fa-boxes-stacked',
        items: [
          { id: 'not-sent-boxes', label: 'קרטונים שלא נשלחו', href: '/shipments/not-sent-boxes', icon: 'fa-file-circle-xmark' },
          { id: 'sent-boxes', label: 'קרטונים שנשלחו', href: '/shipments/sent-boxes', icon: 'fa-truck-ramp-box' },
          { id: 'closed-boxes', label: 'קרטונים סגורים', href: '/shipments/closed-boxes', icon: 'fa-box' },
          { id: 'open-boxes', label: 'קרטונים פתוחים', href: '/shipments/open-boxes', icon: 'fa-door-open' },
        ],
      },
      {
        id: 'shipment-items',
        title: 'כל פריטי המשלוחים',
        href: '/shipments/shipment-items',
        icon: 'fa-lemon',
        items: [
          { id: 'sent-items', label: 'פריטים שנשלחו', href: '/shipments/sent-items', icon: 'fa-paper-plane' },
          { id: 'pending-items', label: 'פריטים שלא נשלחו', href: '/shipments/pending-items', icon: 'fa-clock' },
        ],
      },
    ],
    pageTitle: 'כל המשלוחים',
    emptyState: {
      packaging: {
        title: 'אין משלוחים באריזה להצגה',
        description: 'לחץ על "משלוח חדש" כדי להתחיל להוסיף משלוחים.',
      },
      completed: {
        title: 'אין משלוחים שהושלמו להצגה',
        description: 'כשתסיים אריזה ומשלוח, הרשומות יופיעו כאן.',
      },
      'not-sent-boxes': {
        title: 'אין קרטונים שלא נשלחו',
        description: 'ניתן לפתוח קרטון חדש ולהתחיל שיבוץ פריטים.',
      },
      'sent-boxes': {
        title: 'אין קרטונים שנשלחו',
        description: 'כאן יוצגו קרטונים שכבר יצאו למשלוח.',
      },
      'closed-boxes': {
        title: 'אין קרטונים סגורים',
        description: 'סגור קרטונים פעילים כדי לראות אותם כאן.',
      },
      'open-boxes': {
        title: 'אין קרטונים פתוחים',
        description: 'פתח קרטון חדש כדי להתחיל לארוז.',
      },
      'sent-items': {
        title: 'אין פריטים שנשלחו',
        description: 'כאן יופיעו כל הפריטים שנשלחו ללקוחות.',
      },
      'pending-items': {
        title: 'אין פריטים שממתינים למשלוח',
        description: 'כשיוזנו פריטים חדשים הם יופיעו כאן.',
      },
      default: {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהתפריט הצידי כדי לראות מידע רלוונטי.',
      },
    },
    addItem: 'פריט חדש',
    addBox: 'קרטון חדש',
    addShipment: 'משלוח חדש',
    settings: 'הגדרות',
  },
  en: {
    topNav: [
      { id: 'harvest', label: 'Harvest & Sorting' },
      { id: 'shipments', label: 'Shipments' },
      { id: 'partners', label: 'Partners' },
      { id: 'customers', label: 'Customers' },
      { id: 'workers', label: 'Workers' },
      { id: 'payments', label: 'Expenses & Payments' },
      { id: 'seasons', label: 'Seasons' },
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
        title: 'Shipment Items',        href: '/shipments/shipment-items',        items: [
          { id: 'sent-items', label: 'Sent Items', href: '/shipments/sent-items' },
          { id: 'pending-items', label: 'Items Not Sent', href: '/shipments/pending-items' },
        ],
      },
    ],
    pageTitle: 'All Shipments',
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
  },
};
