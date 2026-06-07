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
      title: 'משלוחים',
      icon: 'fa-truck',
      items: [
        { id: 'all-shipments', label: 'כל המשלוחים', href: '/shipments/all-shipments', icon: 'fa-truck' },
        { id: 'packaging', label: 'משלוחים באריזה', badge: 2, href: '/shipments/packaging', icon: 'fa-box-open' },
        { id: 'completed', label: 'משלוחים שהושלמו', href: '/shipments/completed', icon: 'fa-circle-check' },
      ],
    },
    {
      id: 'all-boxes',
      title: 'קרטונים',
      icon: 'fa-boxes-stacked',
      items: [
        { id: 'all-boxes', label: 'כל הקרטונים', href: '/shipments/all-boxes', icon: 'fa-boxes-stacked' },
        { id: 'not-sent-boxes', label: 'קרטונים שלא נשלחו', href: '/shipments/not-sent-boxes', icon: 'fa-file-circle-xmark' },
        { id: 'sent-boxes', label: 'קרטונים שנשלחו', href: '/shipments/sent-boxes', icon: 'fa-truck-ramp-box' },
        { id: 'closed-boxes', label: 'קרטונים סגורים', href: '/shipments/closed-boxes', icon: 'fa-box' },
        { id: 'open-boxes', label: 'קרטונים פתוחים', href: '/shipments/open-boxes', icon: 'fa-door-open' },
      ],
    },
    {
      id: 'shipment-items',
      title: 'פריטים',
      icon: 'fa-lemon',
      items: [
        { id: 'shipment-items', label: 'כל פריטי המשלוחים', href: '/shipments/shipment-items', icon: 'fa-lemon' },
        { id: 'sent-items', label: 'פריטים שנשלחו', href: '/shipments/sent-items', icon: 'fa-paper-plane' },
        { id: 'pending-items', label: 'פריטים שלא נשלחו', href: '/shipments/pending-items', icon: 'fa-clock' },
      ],
    },
  ],
  pageTitle: 'משלוחים',
  actionSelected: (label: string) => `נבחרה פעולה: ${label}`,
  emptyState: {
    'all-shipments': {
      title: 'כל המשלוחים',
      description: 'כאן מוצגים כל המשלוחים במערכת.',
    },
    'all-boxes': {
      title: 'כל הקרטונים',
      description: 'כאן מוצגים כל הקרטונים במערכת.',
    },
    'shipment-items': {
      title: 'כל פריטי המשלוחים',
      description: 'כאן מוצגים כל פריטי המשלוחים במערכת.',
    },
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
  tableLabels: {
    title: 'כל המשלוחים',
    description: 'תצוגה של כל המשלוחים עם כמות קרטונים, כמות אתרוגים ותאריך משלוח.',
    seasonFilterLabel: 'עונה',
    statusFilterLabel: 'סטטוס משלוח',
    allStatusesOption: 'כל הסטטוסים',
    activeSeasonBadge: 'פעילה',
    noActiveSeason: 'אין עונה זמינה',
    colDetails: 'פרטים',
    colShipmentNumber: 'מס\' משלוח',
    colBoxCount: 'כמות קרטונים',
    colQuantity: 'כמות אתרוגים',
    colStatus: 'סטטוס',
    colShippedAt: 'תאריך משלוח',
    detailsButtonAriaLabel: 'פתיחת פרטי משלוח',
    empty: 'אין משלוחים להצגה',
    loading: 'טוען משלוחים...',
    error: 'שגיאה בטעינת המשלוחים',
    statusLabels: {
      PREPARING: 'בהכנה',
      SHIPPED: 'נשלח',
      DELIVERED: 'נמסר',
      CANCELLED: 'בוטל',
    },
  },
};