import { useEffect, useMemo, useState } from 'react';
import { fetchAllMessages, Message } from '../../services/messagesApi';
import { FaReply, FaEnvelopeOpen, FaEnvelope } from 'react-icons/fa6';

type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

type MailboxCounts = Record<SidebarFilter, number>;

type MessagesListProps = {
  filter: SidebarFilter;
  userId?: number;
  lang: 'he' | 'en';
  onCountsChange?: (counts: MailboxCounts) => void;
};

export function MessagesList({ filter, userId, lang, onCountsChange }: MessagesListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAllMessages()
      .then(setMessages)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
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
                  <span>{lastMessage.sender.name}</span>
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
                return (
                  <article
                    key={msg.id}
                    className={`messages-thread__item${isOutgoing ? ' messages-thread__item--outgoing' : ''}`}
                  >
                    <span className={`messages-priority messages-priority--${toPriority(msg.priority).toLowerCase()}`}>
                      {labels.priority[toPriority(msg.priority)]}
                    </span>
                    <div className="messages-thread__meta">
                      <strong>{msg.sender.name}</strong>
                      <div className="messages-thread__meta-right">
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="messages-thread__text">{msg.content}</p>
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
