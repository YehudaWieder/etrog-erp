import type { NavItem, SidebarSection } from '../../types/navigation';

export const SHIPMENTS_TOP_NAV: NavItem[] = [
  { id: 'harvest', label: 'קטיף ומיון' },
  { id: 'shipments', label: 'משלוחים' },
  { id: 'partners', label: 'סוחרים' },
  { id: 'customers', label: 'לקוחות' },
  { id: 'workers', label: 'עובדים' },
  { id: 'payments', label: 'הוצאות ותשלומים' },
];

export const SHIPMENTS_SIDEBAR: SidebarSection[] = [
  {
    id: 'all-shipments',
    title: 'כל המשלוחים',
    items: [
      { id: 'packaging', label: 'משלוחים באריזה', badge: 2, href: '/shipments/packaging' },
      { id: 'completed', label: 'משלוחים שהושלמו', href: '/shipments/completed' },
    ],
  },
  {
    id: 'all-boxes',
    title: 'כל הקרטונים',
    items: [
      { id: 'not-sent-boxes', label: 'קרטונים שלא נשלחו', href: '/shipments/not-sent-boxes' },
      { id: 'sent-boxes', label: 'קרטונים שנשלחו', href: '/shipments/sent-boxes' },
      { id: 'closed-boxes', label: 'קרטונים סגורים', href: '/shipments/closed-boxes' },
      { id: 'open-boxes', label: 'קרטונים פתוחים', href: '/shipments/open-boxes' },
    ],
  },
  {
    id: 'shipment-items',
    title: 'כל פריטי המשלוחים',
    items: [
      { id: 'sent-items', label: 'פריטים שנשלחו', href: '/shipments/sent-items' },
      { id: 'pending-items', label: 'פריטים שלא נשלחו', href: '/shipments/pending-items' },
    ],
  },
];
