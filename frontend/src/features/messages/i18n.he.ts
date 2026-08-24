import type { MessagesI18n } from './i18n';

export const MESSAGES_I18N_HE: MessagesI18n = {
  userNameFallback: 'הפרופיל שלי',
  topNav: [
    { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf', href: '/harvest/harvest-summary' },
    { id: 'shipments', label: 'משלוחים', icon: 'fa-truck', href: '/shipments/shipment-items-summary' },
    { id: 'partners', label: 'מלאי סוחרים', icon: 'fa-handshake', href: '/traders' },
    { id: 'customers', label: 'מלאי לקוחות', icon: 'fa-users' },
    { id: 'workers', label: 'קטיף א"י', icon: 'fa-person', href: '/harvest' },
    { id: 'israel-shipments', label: 'משלוחים א"י', icon: 'fa-truck-fast', href: '/shipments/shipment-items-summary' },
    { id: 'israel-inventory', label: 'מלאי א"י', icon: 'fa-warehouse', href: '/inventory' },
    { id: 'israel-payments', label: 'הוצאות ותשלומים א"י', icon: 'fa-file-invoice-dollar', href: '/payments' },
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
  threadMeta: {
    originalMessage: 'הודעה מקורית',
    from: 'מאת',
    date: 'בתאריך',
    to: 'אל',
    toFallback: 'ללא נמען',
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
};