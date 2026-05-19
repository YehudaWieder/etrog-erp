import type { SidebarSection, NavItem } from '../../types/navigation';

type EmptyStateContent = {
  title: string;
  description: string;
};

type MessagesI18n = {
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  actions: {
    sendNew: string;
    deleteMessage: string;
  };
  emptyState: Record<string, EmptyStateContent>;
};

export const MESSAGES_I18N: Record<'he' | 'en', MessagesI18n> = {
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
        id: 'all-messages',
        title: 'כל ההודעות',
        href: '/messages/all-messages',
        icon: 'fa-envelope',
        items: [
          { id: 'incoming-messages', label: 'הודעות נכנסות', href: '/messages/incoming-messages', icon: 'fa-inbox' },
          { id: 'outgoing-messages', label: 'הודעות יוצאות', href: '/messages/outgoing-messages', icon: 'fa-paper-plane' },
          { id: 'unread-messages', label: 'הודעות שלא נקראו', href: '/messages/unread-messages', icon: 'fa-envelope-open-text' },
        ],
      },
    ],
    pageTitle: 'הודעות',
    settings: 'הגדרות',
    actions: {
      sendNew: 'שליחת הודעה חדשה',
      deleteMessage: 'מחיקת הודעה',
    },
    emptyState: {
      'all-messages': {
        title: 'כל ההודעות יוצגו כאן',
        description: 'כאן תוכל לראות את כל תעבורת ההודעות במערכת.',
      },
      'incoming-messages': {
        title: 'אין הודעות נכנסות להצגה',
        description: 'הודעות חדשות שיתקבלו יופיעו ברשימה זו.',
      },
      'outgoing-messages': {
        title: 'אין הודעות יוצאות להצגה',
        description: 'הודעות שתשלח יוצגו כאן לאחר השליחה.',
      },
      'unread-messages': {
        title: 'אין הודעות שלא נקראו',
        description: 'כאשר יתקבלו הודעות שלא נקראו הן יופיעו כאן.',
      },
      default: {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהסרגל הצידי כדי להציג הודעות.',
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
        id: 'all-messages',
        title: 'All Messages',
        href: '/messages/all-messages',
        icon: 'fa-envelope',
        items: [
          { id: 'incoming-messages', label: 'Incoming Messages', href: '/messages/incoming-messages', icon: 'fa-inbox' },
          { id: 'outgoing-messages', label: 'Outgoing Messages', href: '/messages/outgoing-messages', icon: 'fa-paper-plane' },
          { id: 'unread-messages', label: 'Unread Messages', href: '/messages/unread-messages', icon: 'fa-envelope-open-text' },
        ],
      },
    ],
    pageTitle: 'Messages',
    settings: 'Settings',
    actions: {
      sendNew: 'Send New Message',
      deleteMessage: 'Delete Message',
    },
    emptyState: {
      'all-messages': {
        title: 'All messages will appear here',
        description: 'Use this view to monitor all message traffic in the system.',
      },
      'incoming-messages': {
        title: 'No incoming messages to display',
        description: 'Newly received messages will appear in this list.',
      },
      'outgoing-messages': {
        title: 'No outgoing messages to display',
        description: 'Messages you send will appear here.',
      },
      'unread-messages': {
        title: 'No unread messages',
        description: 'Unread messages will appear here when available.',
      },
      default: {
        title: 'No data to display',
        description: 'Select a sidebar item to view messages.',
      },
    },
  },
};
