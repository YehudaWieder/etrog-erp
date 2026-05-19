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
  compose: {
    title: string;
    description: string;
    recipients: string;
    recipientsPlaceholder: string;
    recipientsEmpty: string;
    noMatchingRecipients: string;
    toggleRecipients: string;
    priority: string;
    subject: string;
    content: string;
    subjectPlaceholder: string;
    contentPlaceholder: string;
    cancel: string;
    close: string;
    send: string;
    sending: string;
    success: string;
    validationRecipients: string;
    validationSubject: string;
    validationContent: string;
    failed: string;
    priorities: {
      LOW: string;
      NORMAL: string;
      HIGH: string;
      URGENT: string;
    };
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
    compose: {
      title: 'שליחת הודעה חדשה',
      description: 'בחר נמענים, עדכן דחיפות ושלח הודעה מתוך המערכת.',
      recipients: 'נמענים',
      recipientsPlaceholder: 'הקלד שם נמען...',
      recipientsEmpty: 'אין נמענים זמינים',
      noMatchingRecipients: 'אין התאמות לחיפוש',
      toggleRecipients: 'פתיחת רשימת נמענים',
      priority: 'רמת דחיפות',
      subject: 'כותרת',
      content: 'תוכן ההודעה',
      subjectPlaceholder: 'כתוב כותרת ברורה להודעה',
      contentPlaceholder: 'כתוב כאן את גוף ההודעה...',
      cancel: 'ביטול',
      close: 'סגירה',
      send: 'שליחה',
      sending: 'שולח...',
      success: 'ההודעה נשלחה בהצלחה',
      validationRecipients: 'יש לבחור לפחות נמען אחד',
      validationSubject: 'יש להזין כותרת',
      validationContent: 'יש להזין תוכן הודעה',
      failed: 'שליחת ההודעה נכשלה',
      priorities: {
        LOW: 'נמוכה',
        NORMAL: 'רגילה',
        HIGH: 'גבוהה',
        URGENT: 'דחופה',
      },
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
    compose: {
      title: 'Send New Message',
      description: 'Select recipients, set urgency, and send directly from the system.',
      recipients: 'Recipients',
      recipientsPlaceholder: 'Type a recipient name...',
      recipientsEmpty: 'No recipients available',
      noMatchingRecipients: 'No matching recipients',
      toggleRecipients: 'Open recipients list',
      priority: 'Priority',
      subject: 'Subject',
      content: 'Message Content',
      subjectPlaceholder: 'Write a clear subject',
      contentPlaceholder: 'Write the message body here...',
      cancel: 'Cancel',
      close: 'Close',
      send: 'Send',
      sending: 'Sending...',
      success: 'Message sent successfully',
      validationRecipients: 'Please select at least one recipient',
      validationSubject: 'Please enter a subject',
      validationContent: 'Please enter message content',
      failed: 'Failed to send message',
      priorities: {
        LOW: 'Low',
        NORMAL: 'Normal',
        HIGH: 'High',
        URGENT: 'Urgent',
      },
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
