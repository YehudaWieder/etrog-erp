export const SHIPMENTS_I18N_HE = {
  userNameFallback: 'הפרופיל שלי',
  topNav: [
    { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
    { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
    { id: 'partners', label: 'מלאי סוחרים', icon: 'fa-handshake' },
    { id: 'customers', label: 'מלאי לקוחות', icon: 'fa-users' },
    { id: 'workers', label: 'עובדים', icon: 'fa-person' },
    { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
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
  actionSelected: (label: string) => `נבחרה פעולה: ${label}`,
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
};