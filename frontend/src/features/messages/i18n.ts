import type { SidebarSection, NavItem } from '../../types/navigation';
import { MESSAGES_I18N_EN } from './i18n.en';
import { MESSAGES_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type MessagesI18n = {
  userNameFallback: string;
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  actions: {
    sendNew: string;
    deleteMessage: string;
  };
  threadMeta: {
    originalMessage: string;
    from: string;
    date: string;
    to: string;
    toFallback: string;
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
  he: MESSAGES_I18N_HE,
  en: MESSAGES_I18N_EN,
};
