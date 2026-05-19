import { useEffect, useMemo, useState } from 'react';
import { deleteMessage, fetchAllMessages, Message } from '../../services/messagesApi';
import { FaReply, FaEnvelopeOpen, FaEnvelope, FaShareFromSquare, FaTrashCan } from 'react-icons/fa6';
import { getAllProfiles } from '../../services/authService';

type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

type MailboxCounts = Record<SidebarFilter, number>;

type MessagesListProps = {
  filter: SidebarFilter;
  userId?: number;
  lang: 'he' | 'en';
  refreshKey?: number;
  onCountsChange?: (counts: MailboxCounts) => void;
  onActionFeedback?: (text: string) => void;
};

export function MessagesList({ filter, userId, lang, refreshKey = 0, onCountsChange, onActionFeedback }: MessagesListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAllMessages()
      .then(setMessages)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    getAllProfiles()
      .then((profiles) => {
        const map: Record<number, string> = {};
        for (const profile of profiles) {
          map[profile.id] = profile.name;
        }
        setUserNamesById(map);
      })
      .catch(() => {
        // Keep graceful fallback when names directory cannot be loaded.
        setUserNamesById({});
      });
  }, []);

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
      return userMessages.filter((msg) => msg.recipientIds.includes(userId) && !msg.readByIds.includes(userId));
    }
    return userMessages;
  }, [filter, userId, userMessages]);

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
    if (!sortedThreads.length) {
      setSelectedRootId(null);
      return;
    }

    if (selectedRootId === null || !sortedThreads.some((thread) => thread.rootId === selectedRootId)) {
      setSelectedRootId(sortedThreads[0].rootId);
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
    onActionFeedback?.(`${labels.actions.replyNotice} #${message.id}`);
  };

  const handleForward = (message: Message) => {
    onActionFeedback?.(`${labels.actions.forwardNotice} #${message.id}`);
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
              onClick={() => setSelectedRootId(rootId)}
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
