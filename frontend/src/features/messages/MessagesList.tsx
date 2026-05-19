import { useEffect, useMemo, useState, useRef } from 'react';
import { deleteMessage, fetchAllMessages, sendMessage, markMessageAsRead, Message, type MessagePriority } from '../../services/messagesApi';
import { FaReply, FaEnvelopeOpen, FaEnvelope, FaShareFromSquare, FaTrashCan, FaPaperPlane, FaXmark, FaChevronDown } from 'react-icons/fa6';
import { getAllProfiles, getCurrentUser } from '../../services/authService';

type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

type MailboxCounts = Record<SidebarFilter, number>;

export type ComposeAction = 'reply' | 'forward';

type MessagesListProps = {
  filter: SidebarFilter;
  userId?: number;
  lang: 'he' | 'en';
  refreshKey?: number;
  onCountsChange?: (counts: MailboxCounts) => void;
  onActionFeedback?: (text: string) => void;
};

export function MessagesList({
  filter,
  userId,
  lang,
  refreshKey = 0,
  onCountsChange,
  onActionFeedback,
}: MessagesListProps) {
  // Inline reply/forward state
  const [inlineAction, setInlineAction] = useState<null | { type: 'reply' | 'forward'; messageId: number }>(null);
  const [inlineReplyContent, setInlineReplyContent] = useState('');
  const [inlineForwardContent, setInlineForwardContent] = useState('');
  const [inlineForwardRecipients, setInlineForwardRecipients] = useState<number[]>([]);
  const [inlineError, setInlineError] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState(false);
  // showRecipientSuggestions is derived, not state
  const currentUser = getCurrentUser();
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [markingAsReadIds, setMarkingAsReadIds] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAllMessages()
      .then(setMessages)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    const pollIntervalMs = 2 * 60 * 1000;
    let isMounted = true;

    const refreshMessagesSilently = async () => {
      try {
        const nextMessages = await fetchAllMessages();
        if (!isMounted) {
          return;
        }
        setMessages(nextMessages);
        setError(null);
      } catch {
        // Keep current UI state on background refresh failures.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshMessagesSilently();
    }, pollIntervalMs);

    const handleWindowFocus = () => {
      void refreshMessagesSilently();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshMessagesSilently();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    getAllProfiles()
      .then((profiles) => {
        const map: Record<number, string> = {};
        for (const profile of profiles) {
          map[profile.id] = profile.name;
        }
        setUserNamesById(map);
        setRecipientOptions(profiles.filter((p) => p.id !== currentUser?.id).map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {
        setUserNamesById({});
        setRecipientOptions([]);
      });
  }, [currentUser?.id]);

  const byId = useMemo(() => {
    const result = new Map<number, Message>();
    for (const msg of messages) {
      result.set(msg.id, msg);
    }
    return result;
  }, [messages]);

  const userMessages = useMemo(() => {
    if (!userId) {
      return [];
    }

    return messages.filter((msg) => msg.senderId === userId || msg.recipientIds.includes(userId));
  }, [messages, userId]);

  const counts = useMemo<MailboxCounts>(() => {
    const inbox = userMessages.filter((msg) => userId !== undefined && msg.recipientIds.includes(userId)).length;
    const outbox = userMessages.filter((msg) => userId !== undefined && msg.senderId === userId).length;
    const unread = userMessages.filter(
      (msg) => userId !== undefined && msg.recipientIds.includes(userId) && !msg.readByIds.includes(userId),
    ).length;

    return {
      'all-messages': userMessages.length,
      'incoming-messages': inbox,
      'outgoing-messages': outbox,
      'unread-messages': unread,
    };
  }, [userMessages, userId]);

  useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  const filteredMessages = useMemo(() => {
    if (!userId) {
      return [];
    }

    if (filter === 'incoming-messages') {
      return userMessages.filter((msg) => msg.recipientIds.includes(userId));
    }
    if (filter === 'outgoing-messages') {
      return userMessages.filter((msg) => msg.senderId === userId);
    }
    if (filter === 'unread-messages') {
      return userMessages.filter((msg) => {
        const isUnreadIncoming = msg.recipientIds.includes(userId) && !msg.readByIds.includes(userId);
        if (isUnreadIncoming) {
          return true;
        }

        // Keep the currently opened thread visible in the unread tab
        // so it does not disappear immediately after first open.
        if (selectedRootId !== null) {
          return findThreadRootId(msg, byId) === selectedRootId;
        }

        return false;
      });
    }
    return userMessages;
  }, [byId, filter, selectedRootId, userId, userMessages]);

  const threadMap = useMemo(() => {
    const result: Record<number, Message[]> = {};
    for (const msg of filteredMessages) {
      const rootId = findThreadRootId(msg, byId);
      if (!result[rootId]) {
        result[rootId] = [];
      }
      result[rootId].push(msg);
    }
    return result;
  }, [filteredMessages, byId]);

  const sortedThreads = useMemo(() => {
    return Object.entries(threadMap)
      .map(([rootId, thread]) => {
        const lastMessage = thread.reduce((latest, current) => {
          return new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest;
        }, thread[0]);

        return {
          rootId: Number(rootId),
          thread,
          lastMessage,
        };
      })
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }, [threadMap]);

  useEffect(() => {
    setSelectedRootId(null);
  }, [filter]);

  useEffect(() => {
    if (!sortedThreads.length) {
      setSelectedRootId(null);
      return;
    }

    if (selectedRootId !== null && !sortedThreads.some((thread) => thread.rootId === selectedRootId)) {
      setSelectedRootId(null);
    }
  }, [selectedRootId, sortedThreads]);

  const selectedThreadMessages = useMemo(() => {
    if (selectedRootId === null) {
      return [];
    }

    const fullThread = userMessages
      .filter((msg) => findThreadRootId(msg, byId) === selectedRootId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return fullThread;
  }, [byId, selectedRootId, userMessages]);

  const selectedSubject = selectedThreadMessages[0]?.subject ?? '';

  const labels = {
    loading: lang === 'he' ? 'טוען הודעות...' : 'Loading messages...',
    error: lang === 'he' ? 'שגיאה:' : 'Error:',
    empty: lang === 'he' ? 'אין הודעות להצגה' : 'No messages to display',
    openThread: lang === 'he' ? 'בחר שרשור כדי לצפות בהודעות' : 'Select a thread to view messages',
    threadMessages: lang === 'he' ? 'הודעות בשרשור' : 'Messages in thread',
    threadCount: lang === 'he' ? 'הודעות בשרשור' : 'messages in thread',
    priority: {
      LOW: lang === 'he' ? 'נמוכה' : 'Low',
      NORMAL: lang === 'he' ? 'רגילה' : 'Normal',
      HIGH: lang === 'he' ? 'גבוהה' : 'High',
      URGENT: lang === 'he' ? 'דחופה' : 'Urgent',
    } as Record<MessagePriority, string>,
    actions: {
      reply: lang === 'he' ? 'מענה' : 'Reply',
      forward: lang === 'he' ? 'העברה' : 'Forward',
      delete: lang === 'he' ? 'מחיקה' : 'Delete',
      deleting: lang === 'he' ? 'מוחק...' : 'Deleting...',
      replyNotice: lang === 'he' ? 'נבחרה פעולה: מענה להודעה' : 'Action selected: reply to message',
      forwardNotice: lang === 'he' ? 'נבחרה פעולה: העברת הודעה' : 'Action selected: forward message',
      deleteNotice: lang === 'he' ? 'ההודעה נמחקה' : 'Message deleted',
      deleteError: lang === 'he' ? 'מחיקת ההודעה נכשלה' : 'Failed to delete message',
    },
  };


  const handleReply = (message: Message) => {
    setInlineAction({ type: 'reply', messageId: message.id });
    setInlineReplyContent('');
    setInlineError('');
    setTimeout(() => {
      const el = document.getElementById(`inline-reply-input-${message.id}`);
      if (el) (el as HTMLTextAreaElement).focus();
    }, 100);
  };

  const handleForward = (message: Message) => {
    setInlineAction({ type: 'forward', messageId: message.id });
    setInlineForwardContent(`\n\n--- ${lang === 'he' ? 'הודעה מקורית' : 'Original message'} ---\n${lang === 'he' ? 'מאת' : 'From'}: ${message.sender.name}\n${lang === 'he' ? 'בתאריך' : 'Date'}: ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}`);
    setInlineForwardRecipients([]);
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
    setInlineError('');
    setTimeout(() => {
      if (recipientInputRef.current) recipientInputRef.current.focus();
    }, 100);
  };
  // Recipient autocomplete for forward
  const recipientSuggestions = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    const selectedSet = new Set(inlineForwardRecipients);
    return recipientOptions
      .filter((recipient) => !selectedSet.has(recipient.id))
      .filter((recipient) => (query ? recipient.name.toLowerCase().includes(query) : true))
      .slice(0, 8);
  }, [inlineForwardRecipients, recipientOptions, recipientQuery]);

  const showRecipientSuggestions = recipientQuery.trim().length > 0 || isRecipientMenuOpen;

  const addRecipient = (recipientId: number) => {
    setInlineForwardRecipients((prev) => prev.includes(recipientId) ? prev : [...prev, recipientId]);
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
    setTimeout(() => {
      if (recipientInputRef.current) recipientInputRef.current.focus();
    }, 100);
  };

  const removeRecipient = (recipientId: number) => {
    setInlineForwardRecipients((prev) => prev.filter((id) => id !== recipientId));
  };

  const handleRecipientInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (recipientSuggestions.length) {
        addRecipient(recipientSuggestions[0].id);
      }
    }
    if (event.key === 'Backspace' && !recipientQuery && inlineForwardRecipients.length) {
      removeRecipient(inlineForwardRecipients[inlineForwardRecipients.length - 1]);
    }
  };
  const handleInlineReplySend = async (msg: Message) => {
    if (!inlineReplyContent.trim()) {
      setInlineError(lang === 'he' ? 'יש להזין תוכן תשובה' : 'Please enter a reply');
      return;
    }

    const replyRecipientIds =
      userId !== undefined && msg.senderId === userId
        ? msg.recipientIds.filter((id) => id !== userId)
        : [msg.senderId];

    if (!replyRecipientIds.length) {
      setInlineError(lang === 'he' ? 'לא נמצא נמען לשליחת התשובה' : 'No recipient found for this reply');
      return;
    }

    setInlineLoading(true);
    setInlineError('');
    try {
      const createdMessage = await sendMessage({
        recipientIds: replyRecipientIds,
        subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
        content: inlineReplyContent.trim(),
        priority: msg.priority as MessagePriority,
        replyToMessageId: msg.id,
      });
      setMessages((prev) => [...prev, createdMessage]);
      setInlineAction(null);
      setInlineReplyContent('');
      setInlineError('');
      setInlineLoading(false);
      onActionFeedback?.(lang === 'he' ? 'התשובה נשלחה' : 'Reply sent');
    } catch {
      setInlineError(lang === 'he' ? 'שליחת התשובה נכשלה' : 'Failed to send reply');
      setInlineLoading(false);
    }
  };

  const handleInlineForwardSend = async (msg: Message) => {
    if (!inlineForwardRecipients.length) {
      setInlineError(lang === 'he' ? 'יש לבחור לפחות נמען אחד' : 'Select at least one recipient');
      return;
    }
    if (!inlineForwardContent.trim()) {
      setInlineError(lang === 'he' ? 'יש להזין תוכן הודעה' : 'Please enter message content');
      return;
    }
    setInlineLoading(true);
    setInlineError('');
    try {
      const createdMessage = await sendMessage({
        recipientIds: inlineForwardRecipients,
        subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
        content: inlineForwardContent.trim(),
        priority: msg.priority as MessagePriority,
      });
      setMessages((prev) => [...prev, createdMessage]);
      setInlineAction(null);
      setInlineForwardContent('');
      setInlineForwardRecipients([]);
      setInlineError('');
      setInlineLoading(false);
      onActionFeedback?.(lang === 'he' ? 'ההודעה הועברה' : 'Message forwarded');
    } catch {
      setInlineError(lang === 'he' ? 'העברה נכשלה' : 'Failed to forward message');
      setInlineLoading(false);
    }
  };

  const handleDelete = async (message: Message) => {
    if (!userId || message.senderId !== userId || deletingMessageId !== null) {
      return;
    }

    try {
      setDeletingMessageId(message.id);
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      onActionFeedback?.(labels.actions.deleteNotice);
    } catch {
      onActionFeedback?.(labels.actions.deleteError);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleThreadOpen = async (rootId: number, lastMessage: Message) => {
    setSelectedRootId(rootId);

    if (userId === undefined) {
      return;
    }

    const isIncoming = lastMessage.recipientIds.includes(userId);
    const isUnread = !lastMessage.readByIds.includes(userId);

    if (!isIncoming || !isUnread || markingAsReadIds.includes(lastMessage.id)) {
      return;
    }

    setMarkingAsReadIds((prev) => [...prev, lastMessage.id]);
    try {
      await markMessageAsRead(lastMessage.id);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== lastMessage.id || msg.readByIds.includes(userId)) {
            return msg;
          }
          return {
            ...msg,
            readByIds: [...msg.readByIds, userId],
          };
        }),
      );
    } finally {
      setMarkingAsReadIds((prev) => prev.filter((id) => id !== lastMessage.id));
    }
  };

  if (loading) return <div>{labels.loading}</div>;
  if (error) return <div>{labels.error} {error}</div>;
  if (filteredMessages.length === 0) return <div>{labels.empty}</div>;

  return (
    <div className="messages-mailbox">
      <aside className="messages-list" aria-label="Messages list">
        {sortedThreads.map(({ rootId, thread, lastMessage }) => {
          const isUnread =
            userId !== undefined &&
            lastMessage.recipientIds.includes(userId) &&
            !lastMessage.readByIds.includes(userId);
          const isOutgoing = userId !== undefined && lastMessage.senderId === userId;
          const metaMain = buildMessageMetaMain(lastMessage, {
            lang,
            userId,
            userNamesById,
          });

          return (
            <button
              key={rootId}
              type="button"
              className={`messages-list__item${isUnread ? ' messages-list__item--unread' : ''}${
                selectedRootId === rootId ? ' is-active' : ''
              }`}
              onClick={() => {
                void handleThreadOpen(rootId, lastMessage);
              }}
            >
              <div className="messages-list__icon">
                {thread.length > 1 ? <FaReply /> : isUnread ? <FaEnvelope /> : <FaEnvelopeOpen />}
              </div>
              <div className="messages-list__content">
                <span className={`messages-priority messages-priority--${toPriority(lastMessage.priority).toLowerCase()}`}>
                  {labels.priority[toPriority(lastMessage.priority)]}
                </span>
                <div className="messages-list__meta">
                  {metaMain.tooltip ? (
                    <span className="messages-meta-tooltip" data-tooltip={metaMain.tooltip}>
                      {metaMain.text}
                    </span>
                  ) : (
                    <span>{metaMain.text}</span>
                  )}
                  <span>{new Date(lastMessage.createdAt).toLocaleString()}</span>
                </div>
                <div className="messages-list__subject">{lastMessage.subject}</div>
                <div className="messages-list__preview">
                  {lastMessage.content.slice(0, 90)}
                  {lastMessage.content.length > 90 ? '...' : ''}
                </div>
                {thread.length > 1 ? (
                  <div className="messages-list__thread-count">
                    {thread.length} {labels.threadCount}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </aside>

      <section className="messages-thread" aria-label="Thread view">
        {selectedThreadMessages.length ? (
          <>
            <header className="messages-thread__header">
              <h3 className="messages-thread__title">{selectedSubject}</h3>
              <p className="messages-thread__subtitle">
                {selectedThreadMessages.length} {labels.threadMessages}
              </p>
            </header>
            <div className="messages-thread__items">
              {selectedThreadMessages.map((msg) => {
                const isOutgoing = userId !== undefined && msg.senderId === userId;
                const metaMain = buildMessageMetaMain(msg, { lang, userId, userNamesById });
                return (
                  <article
                    key={msg.id}
                    className={`messages-thread__item${isOutgoing ? ' messages-thread__item--outgoing' : ''}`}
                  >
                    <span className={`messages-priority messages-priority--${toPriority(msg.priority).toLowerCase()}`}>
                      {labels.priority[toPriority(msg.priority)]}
                    </span>
                    <div className="messages-thread__meta">
                      {metaMain.tooltip ? (
                        <strong className="messages-meta-tooltip" data-tooltip={metaMain.tooltip}>{metaMain.text}</strong>
                      ) : (
                        <strong>{metaMain.text}</strong>
                      )}
                      <div className="messages-thread__meta-right">
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="messages-thread__text">{msg.content}</p>
                    <div className="messages-thread__actions">
                      <button
                        type="button"
                        className="messages-thread__action messages-thread__action--icon"
                        onClick={() => handleReply(msg)}
                        aria-label={labels.actions.reply}
                        title={labels.actions.reply}
                      >
                        <FaReply />
                      </button>
                      <button
                        type="button"
                        className="messages-thread__action messages-thread__action--icon"
                        onClick={() => handleForward(msg)}
                        aria-label={labels.actions.forward}
                        title={labels.actions.forward}
                      >
                        <FaShareFromSquare />
                      </button>
                      {isOutgoing ? (
                        <button
                          type="button"
                          className="messages-thread__action messages-thread__action--icon messages-thread__action--danger"
                          onClick={() => handleDelete(msg)}
                          disabled={deletingMessageId === msg.id}
                          aria-label={deletingMessageId === msg.id ? labels.actions.deleting : labels.actions.delete}
                          title={deletingMessageId === msg.id ? labels.actions.deleting : labels.actions.delete}
                        >
                          <FaTrashCan />
                        </button>
                      ) : null}
                    </div>
                    {/* Inline reply/forward form */}
                    {inlineAction && inlineAction.messageId === msg.id && (
                      <div className="messages-inline-compose" style={{ marginTop: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px #0001', padding: 16 }}>
                        <button
                          type="button"
                          className="messages-inline-compose__close"
                          style={{ float: lang === 'he' ? 'left' : 'right', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => { setInlineAction(null); setInlineError(''); }}
                          aria-label={lang === 'he' ? 'סגור' : 'Close'}
                        >
                          <FaXmark />
                        </button>
                        {inlineAction.type === 'reply' ? (
                          <>
                            <textarea
                              id={`inline-reply-input-${msg.id}`}
                              className="form-input"
                              style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
                              value={inlineReplyContent}
                              onChange={e => setInlineReplyContent(e.target.value)}
                              placeholder={lang === 'he' ? 'כתוב תשובה...' : 'Write a reply...'}
                              disabled={inlineLoading}
                            />
                            {inlineError && <div className="messages-compose__error">{inlineError}</div>}
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{ marginTop: 4, width: '100%' }}
                              onClick={() => handleInlineReplySend(msg)}
                              disabled={inlineLoading}
                            >
                              <FaPaperPlane /> {inlineLoading ? (lang === 'he' ? 'שולח...' : 'Sending...') : (lang === 'he' ? 'שלח תשובה' : 'Send reply')}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="messages-compose__recipients-field" style={{ marginBottom: 8 }}>
                              <div className="messages-compose__recipient-picker">
                                {inlineForwardRecipients.map((rid) => {
                                  const rec = recipientOptions.find(r => r.id === rid);
                                  const name = rec?.name || userNamesById[rid] || rid;
                                  return (
                                    <button
                                      key={rid}
                                      type="button"
                                      className="messages-compose__chip"
                                      onClick={() => removeRecipient(rid)}
                                    >
                                      <span>{name}</span>
                                      <FaXmark />
                                    </button>
                                  );
                                })}
                                <input
                                  ref={recipientInputRef}
                                  type="text"
                                  className="messages-compose__recipient-input"
                                  value={recipientQuery}
                                  onChange={e => {
                                    const value = e.target.value;
                                    setRecipientQuery(value);
                                    if (value.trim().length > 0) {
                                      setIsRecipientMenuOpen(true);
                                    }
                                  }}
                                  onKeyDown={handleRecipientInputKeyDown}
                                  placeholder={lang === 'he' ? 'הקלד שם נמען...' : 'Type recipient...'}
                                  disabled={inlineLoading}
                                />
                                <button
                                  type="button"
                                  className="messages-compose__recipient-toggle"
                                  aria-label={lang === 'he' ? 'פתיחת רשימת נמענים' : 'Open recipients list'}
                                  onClick={() => {
                                    setIsRecipientMenuOpen((prev) => !prev);
                                  }}
                                  disabled={inlineLoading}
                                >
                                  <FaChevronDown />
                                </button>
                              </div>
                              {showRecipientSuggestions && recipientSuggestions.length ? (
                                <ul className="messages-compose__suggestions" role="listbox" aria-label={lang === 'he' ? 'נמענים' : 'Recipients'}>
                                  {recipientSuggestions.map((recipient) => (
                                    <li key={recipient.id}>
                                      <button
                                        type="button"
                                        className="messages-compose__suggestion"
                                        onClick={() => addRecipient(recipient.id)}
                                        disabled={inlineLoading}
                                      >
                                        {recipient.name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : showRecipientSuggestions ? (
                                <p className="form-helper-text">
                                  {recipientOptions.length ? (lang === 'he' ? 'אין התאמות לחיפוש' : 'No matching recipients') : (lang === 'he' ? 'אין נמענים זמינים' : 'No recipients available')}
                                </p>
                              ) : null}
                            </div>
                            <textarea
                              className="form-input"
                              style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
                              value={inlineForwardContent}
                              onChange={e => setInlineForwardContent(e.target.value)}
                              placeholder={lang === 'he' ? 'כתוב הודעה להעברה...' : 'Write a message to forward...'}
                              disabled={inlineLoading}
                            />
                            {inlineError && <div className="messages-compose__error">{inlineError}</div>}
                            <button
                              type="button"
                              className="btn btn-success"
                              style={{ marginTop: 4, width: '100%' }}
                              onClick={() => handleInlineForwardSend(msg)}
                              disabled={inlineLoading}
                            >
                              <FaPaperPlane /> {inlineLoading ? (lang === 'he' ? 'שולח...' : 'Sending...') : (lang === 'he' ? 'העבר הודעה' : 'Forward message')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="messages-thread__placeholder">{labels.openThread}</p>
        )}
      </section>
    </div>
  );
}

function buildMessageMetaMain(
  message: Message,
  options: { lang: 'he' | 'en'; userId?: number; userNamesById: Record<number, string> },
): { text: string; tooltip?: string } {
  const { lang, userId, userNamesById } = options;
  const isOutgoing = userId !== undefined && message.senderId === userId;

  if (!isOutgoing) {
    return {
      text: lang === 'he' ? `מאת: ${message.sender.name}` : `From: ${message.sender.name}`,
    };
  }

  const recipientNames = message.recipientIds.map((id) => userNamesById[id] || `#${id}`);
  if (recipientNames.length === 0) {
    return { text: lang === 'he' ? 'אל: -' : 'To: -' };
  }

  if (recipientNames.length === 1) {
    return {
      text: lang === 'he' ? `אל: ${recipientNames[0]}` : `To: ${recipientNames[0]}`,
      tooltip: recipientNames[0],
    };
  }

  const firstName = recipientNames[0];
  const additionalCount = recipientNames.length - 1;
  const shortText =
    lang === 'he'
      ? `אל: ${firstName} +${additionalCount}`
      : `To: ${firstName} +${additionalCount}`;

  return {
    text: shortText,
    tooltip: recipientNames.join(', '),
  };
}

function toPriority(value: string): MessagePriority {
  if (value === 'LOW' || value === 'NORMAL' || value === 'HIGH' || value === 'URGENT') {
    return value;
  }
  return 'NORMAL';
}

function findThreadRootId(msg: Message, byId: Map<number, Message>): number {
  let current = msg;
  while (current.replyToMessageId) {
    const parent = byId.get(current.replyToMessageId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}
