import type { MessagesI18n } from './i18n';

export const MESSAGES_I18N_EN: MessagesI18n = {
  userNameFallback: 'My Profile',
  topNav: [
    { id: 'harvest', label: 'Harvest & Sorting', href: '/harvest/harvest-summary' },
    { id: 'shipments', label: 'Shipments', href: '/shipments/shipment-items-summary' },
    { id: 'partners', label: 'Partners Inventory' },
    { id: 'customers', label: 'Customers Inventory' },
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
  threadMeta: {
    originalMessage: 'Original message',
    from: 'From',
    date: 'Date',
    to: 'To',
    toFallback: 'No recipient',
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
};