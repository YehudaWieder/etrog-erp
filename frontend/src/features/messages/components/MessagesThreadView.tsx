import { FaUsers } from 'react-icons/fa6';
import type { KeyboardEvent, RefObject } from 'react';
import { StickyHeaderBar } from '../../../components/StickyHeaderBar';
import type { Message } from '../../../services/messagesApi';
import type { InlineAction, MessagesListLabels } from '../messagesPage.types';
import { buildMessageMetaMain, getReplyAllRecipientIds, toPriority } from '../services/messagesThreadHelpers.service';
import { InlineThreadCompose } from './InlineThreadCompose';
import { MessagesThreadToolbar } from './MessagesThreadToolbar';

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
    <section className="messages-thread" aria-label="Thread view">
      {selectedThreadMessages.length ? (
        <>
          <header className="messages-thread__header messages-thread__toolbar">
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

          <div className="messages-thread__items">
            {selectedThreadMessages.map((message) => {
              const isOutgoing = userId !== undefined && message.senderId === userId;
              const metaMain = buildMessageMetaMain(message, { lang, userId, userNamesById });

              return (
                <article key={message.id} className={`messages-thread__item${isOutgoing ? ' messages-thread__item--outgoing' : ''}`}>
                  <div className="messages-badges-row">
                    <span className={`messages-priority messages-priority--${toPriority(message.priority).toLowerCase()}`}>
                      {labels.priority[toPriority(message.priority)]}
                    </span>
                    {message.recipientIds.length > 1 ? (
                      <span className="messages-recipient-badge" title={labels.multiRecipient}>
                        <FaUsers />
                        <span>{message.recipientIds.length}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="messages-thread__meta">
                    {metaMain.tooltip ? (
                      <strong className="messages-meta-tooltip" data-tooltip={metaMain.tooltip}>{metaMain.text}</strong>
                    ) : (
                      <strong>{metaMain.text}</strong>
                    )}
                    <div className="messages-thread__meta-right">
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="messages-thread__text">{message.content}</p>

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
        <p className="messages-thread__placeholder">{labels.openThread}</p>
      )}
    </section>
  );
}
