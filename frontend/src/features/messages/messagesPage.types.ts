import type { Message, MessagePriority } from '../../services/messagesApi';

export type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

export type MailboxCounts = Record<SidebarFilter, number>;

export type ComposeAction = 'reply' | 'reply-all' | 'forward';

export type RecipientOption = {
  id: number;
  name: string;
};

export type ComposeFormState = {
  recipientIds: number[];
  priority: MessagePriority;
  subject: string;
  content: string;
  replyToMessageId?: number;
};

export type MessagesListProps = {
  filter: SidebarFilter;
  userId?: number;
  lang: 'he' | 'en';
  initialOpenMessageId?: number;
  refreshKey?: number;
  onCountsChange?: (counts: MailboxCounts) => void;
  onActionFeedback?: (text: string) => void;
  onComposeRequest?: (action: ComposeAction, message: Message) => void;
  onUnreadCountChange?: (count: number) => void;
};

export type ThreadSummary = {
  rootId: number;
  thread: Message[];
  lastMessage: Message;
};

export type InlineAction = {
  type: ComposeAction;
  messageId: number;
};

export type MessagesListLabels = {
  loading: string;
  error: string;
  empty: string;
  openThread: string;
  threadMessages: string;
  threadViewLabel: string;
  threadCount: string;
  threadMeta: {
    originalMessage: string;
    from: string;
    date: string;
    to: string;
    toFallback: string;
  };
  priority: Record<MessagePriority, string>;
  actions: {
    reply: string;
    replyAll: string;
    forward: string;
    print: string;
    delete: string;
    deleting: string;
    replyNotice: string;
    replyAllNotice: string;
    forwardNotice: string;
    deleteNotice: string;
    deleteError: string;
  };
  multiRecipient: string;
  printWindowTitle: string;
  printThreadHeading: string;
  printSubjectLabel: string;
  printGeneratedAtLabel: string;
  compose: {
    close: string;
    replyPlaceholder: string;
    forwardRecipients: string;
    forwardRecipientPlaceholder: string;
    noMatchingRecipients: string;
    noRecipientsAvailable: string;
    forwardPlaceholder: string;
    sendReply: string;
    sendReplyAll: string;
    sendForward: string;
    sending: string;
    replyRequired: string;
    replyRecipientMissing: string;
    replyFailed: string;
    replySent: string;
    replyAllSent: string;
    forwardRecipientsRequired: string;
    forwardContentRequired: string;
    forwardFailed: string;
    forwardSent: string;
    deleteWithReplies: string;
  };
};
