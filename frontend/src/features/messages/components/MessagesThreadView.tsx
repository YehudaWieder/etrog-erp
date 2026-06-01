import { FaUsers } from 'react-icons/fa6';
import type { KeyboardEvent, RefObject } from 'react';
import { StickyHeaderBar } from '../../../components/StickyHeaderBar';
import type { Message } from '../../../services/messagesApi';
import type { InlineAction, MessagesListLabels } from '../messagesPage.types';
import { buildMessageMetaMain, getReplyAllRecipientIds, toPriority } from '../services/messagesThreadHelpers.service';
import { InlineThreadCompose } from './InlineThreadCompose';
import { MessagesThreadToolbar } from './MessagesThreadToolbar';
import styles from './styles/MessagesFeature.module.css';

const PRIORITY_CLASS_BY_VALUE = {
  LOW: styles.priorityLow,
  NORMAL: styles.priorityNormal,
  HIGH: styles.priorityHigh,
  URGENT: styles.priorityUrgent,
} as const;

type MessagesThreadViewProps = {
  selectedThreadMessages: Message[];
  selectedSubject: string;
  userId?: number;
  lang: 'he' | 'en';
  userNamesById: Record<number, string>;
  labels: MessagesListLabels;
  deletingMessageId: number | null;
  onPrintThread: () => void;
  onReply: (message: Message) => void;
  onReplyAll: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
  inlineAction: InlineAction | null;
  inlineReplyContent: string;
  inlineForwardContent: string;
  inlineError: string;
  inlineLoading: boolean;
  recipientQuery: string;
  showRecipientSuggestions: boolean;
  recipientSuggestions: Array<{ id: number; name: string }>;
  selectedForwardRecipients: Array<{ id: number; name: string }>;
  recipientInputRef: RefObject<HTMLInputElement>;
  hasAnyRecipients: boolean;
  onCloseInlineCompose: () => void;
  onReplyContentChange: (value: string) => void;
  onForwardContentChange: (value: string) => void;
  onRecipientQueryChange: (value: string) => void;
  onRecipientKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleRecipientsMenu: () => void;
  onAddRecipient: (recipientId: number) => void;
  onRemoveRecipient: (recipientId: number) => void;
  onSendReply: (message: Message) => void;
  onSendForward: (message: Message) => void;
};

export function MessagesThreadView(props: MessagesThreadViewProps) {
  const {
    selectedThreadMessages,
    selectedSubject,
    userId,
    lang,
    userNamesById,
    labels,
    deletingMessageId,
    onPrintThread,
    onReply,
    onReplyAll,
    onForward,
    onDelete,
    inlineAction,
    inlineReplyContent,
    inlineForwardContent,
    inlineError,
    inlineLoading,
    recipientQuery,
    showRecipientSuggestions,
    recipientSuggestions,
    selectedForwardRecipients,
    recipientInputRef,
    hasAnyRecipients,
    onCloseInlineCompose,
    onReplyContentChange,
    onForwardContentChange,
    onRecipientQueryChange,
    onRecipientKeyDown,
    onToggleRecipientsMenu,
    onAddRecipient,
    onRemoveRecipient,
    onSendReply,
    onSendForward,
  } = props;

  return (
    <section className={styles.thread} aria-label={labels.threadViewLabel}>
      {selectedThreadMessages.length ? (
        <>
          <header className={`${styles.threadHeader} ${styles.threadToolbar}`}>
            <StickyHeaderBar
              title={selectedSubject}
              subtitle={`${selectedThreadMessages.length} ${labels.threadMessages}`}
              actions={(() => {
                const lastMessage = selectedThreadMessages[selectedThreadMessages.length - 1];
                if (!lastMessage) {
                  return null;
                }

                return (
                  <MessagesThreadToolbar
                    message={lastMessage}
                    userId={userId}
                    deletingMessageId={deletingMessageId}
                    labels={labels}
                    onPrint={onPrintThread}
                    onReply={onReply}
                    onReplyAll={onReplyAll}
                    onForward={onForward}
                    onDelete={onDelete}
                  />
                );
              })()}
            />
          </header>

          <div className={styles.threadItems}>
            {selectedThreadMessages.map((message) => {
              const isOutgoing = userId !== undefined && message.senderId === userId;
              const metaMain = buildMessageMetaMain(message, { lang, userId, userNamesById, labels: labels.threadMeta });
              const priority = toPriority(message.priority);

              return (
                <article key={message.id} className={`${styles.threadItem}${isOutgoing ? ` ${styles.threadItemOutgoing}` : ''}`}>
                  <div className={styles.badgesRow}>
                    <span className={`${styles.priority} ${PRIORITY_CLASS_BY_VALUE[priority]}`}>
                      {labels.priority[priority]}
                    </span>
                    {message.recipientIds.length > 1 ? (
                      <span className={styles.recipientBadge} title={labels.multiRecipient}>
                        <FaUsers />
                        <span>{message.recipientIds.length}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.threadMeta}>
                    {metaMain.tooltip ? (
                      <strong className={styles.metaTooltip} data-tooltip={metaMain.tooltip}>{metaMain.text}</strong>
                    ) : (
                      <strong>{metaMain.text}</strong>
                    )}
                    <div className={styles.threadMetaRight}>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className={styles.threadText}>{message.content}</p>

                  {inlineAction && inlineAction.messageId === message.id ? (
                    <InlineThreadCompose
                      message={message}
                      lang={lang}
                      labels={labels}
                      inlineAction={inlineAction}
                      inlineReplyContent={inlineReplyContent}
                      inlineForwardContent={inlineForwardContent}
                      inlineError={inlineError}
                      inlineLoading={inlineLoading}
                      recipientQuery={recipientQuery}
                      showRecipientSuggestions={showRecipientSuggestions}
                      recipientSuggestions={recipientSuggestions}
                      selectedForwardRecipients={selectedForwardRecipients}
                      recipientInputRef={recipientInputRef}
                      onClose={onCloseInlineCompose}
                      onReplyContentChange={onReplyContentChange}
                      onForwardContentChange={onForwardContentChange}
                      onRecipientQueryChange={onRecipientQueryChange}
                      onRecipientKeyDown={onRecipientKeyDown}
                      onToggleRecipientsMenu={onToggleRecipientsMenu}
                      onAddRecipient={onAddRecipient}
                      onRemoveRecipient={onRemoveRecipient}
                      onSendReply={onSendReply}
                      onSendForward={onSendForward}
                      hasAnyRecipients={hasAnyRecipients}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <p className={styles.threadPlaceholder}>{labels.openThread}</p>
      )}
    </section>
  );
}
