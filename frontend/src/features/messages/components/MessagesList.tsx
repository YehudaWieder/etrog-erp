import type { MessagesListProps } from '../messagesPage.types';
import { useInlineThreadCompose } from '../hooks/useInlineThreadCompose';
import { useMessagesMailboxData } from '../hooks/useMessagesMailboxData';
import { getReplyAllRecipientIds } from '../services/messagesThreadHelpers.service';
import { MessagesThreadList } from './MessagesThreadList';
import { MessagesThreadView } from './MessagesThreadView';
import styles from './styles/MessagesFeature.module.css';

export function MessagesList({
  filter,
  userId,
  lang,
  initialOpenMessageId,
  refreshKey = 0,
  onCountsChange,
  onActionFeedback,
  onComposeRequest,
  onUnreadCountChange,
}: MessagesListProps) {
  const {
    loading,
    error,
    labels,
    userNamesById,
    recipientOptions,
    sortedThreads,
    selectedRootId,
    selectedThreadMessages,
    selectedSubject,
    deletingMessageId,
    handleThreadOpen,
    handleDelete,
    handlePrintThread,
    appendCreatedMessage,
  } = useMessagesMailboxData({
    filter,
    userId,
    lang,
    initialOpenMessageId,
    refreshKey,
    onCountsChange,
    onUnreadCountChange,
    onActionFeedback,
  });

  const {
    inlineAction,
    inlineReplyContent,
    inlineForwardContent,
    inlineError,
    inlineLoading,
    recipientQuery,
    isRecipientMenuOpen,
    recipientInputRef,
    recipientSuggestions,
    showRecipientSuggestions,
    selectedForwardRecipients,
    setInlineReplyContent,
    setInlineForwardContent,
    setRecipientQuery,
    setIsRecipientMenuOpen,
    addRecipient,
    removeRecipient,
    handleRecipientInputKeyDown,
    closeInlineCompose,
    handleReply,
    handleReplyAll,
    handleForward,
    handleInlineReplySend,
    handleInlineForwardSend,
  } = useInlineThreadCompose({
    lang,
    userId,
    userNamesById,
    recipientOptions,
    labels,
    onActionFeedback,
    onMessageCreated: appendCreatedMessage,
  });

  if (loading) {
    return <div>{labels.loading}</div>;
  }

  if (error) {
    return <div>{labels.error} {error}</div>;
  }

  if (!sortedThreads.length && !selectedThreadMessages.length) {
    return <div>{labels.empty}</div>;
  }

  const handleReplyAction = (message: Parameters<typeof handleReply>[0]) => {
    handleReply(message);
    onComposeRequest?.('reply', message);
    onActionFeedback?.(labels.actions.replyNotice);
  };

  const handleReplyAllAction = (message: Parameters<typeof handleReplyAll>[0]) => {
    if (!getReplyAllRecipientIds(message, userId).length) {
      return;
    }

    handleReplyAll(message);
    onComposeRequest?.('reply-all', message);
    onActionFeedback?.(labels.actions.replyAllNotice);
  };

  const handleForwardAction = (message: Parameters<typeof handleForward>[0]) => {
    handleForward(message);
    onComposeRequest?.('forward', message);
    onActionFeedback?.(labels.actions.forwardNotice);
  };

  return (
    <div className={styles.mailbox}>
      <MessagesThreadList
        sortedThreads={sortedThreads}
        selectedRootId={selectedRootId}
        userId={userId}
        lang={lang}
        userNamesById={userNamesById}
        labels={labels}
        onOpenThread={(rootId) => {
          void handleThreadOpen(rootId);
        }}
      />

      <MessagesThreadView
        selectedThreadMessages={selectedThreadMessages}
        selectedSubject={selectedSubject}
        userId={userId}
        lang={lang}
        userNamesById={userNamesById}
        labels={labels}
        deletingMessageId={deletingMessageId}
        onPrintThread={handlePrintThread}
        onReply={handleReplyAction}
        onReplyAll={handleReplyAllAction}
        onForward={handleForwardAction}
        onDelete={(message) => {
          void handleDelete(message);
        }}
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
        hasAnyRecipients={recipientOptions.length > 0}
        onCloseInlineCompose={closeInlineCompose}
        onReplyContentChange={setInlineReplyContent}
        onForwardContentChange={setInlineForwardContent}
        onRecipientQueryChange={(value) => {
          setRecipientQuery(value);
          if (value.trim().length > 0) {
            setIsRecipientMenuOpen(true);
            return;
          }

          if (!isRecipientMenuOpen) {
            return;
          }

          setIsRecipientMenuOpen(false);
        }}
        onRecipientKeyDown={handleRecipientInputKeyDown}
        onToggleRecipientsMenu={() => setIsRecipientMenuOpen((prev) => !prev)}
        onAddRecipient={addRecipient}
        onRemoveRecipient={removeRecipient}
        onSendReply={(message) => {
          void handleInlineReplySend(message);
        }}
        onSendForward={(message) => {
          void handleInlineForwardSend(message);
        }}
      />
    </div>
  );
}
