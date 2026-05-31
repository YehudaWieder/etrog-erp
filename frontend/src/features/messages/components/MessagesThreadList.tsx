import { FaEnvelope, FaEnvelopeOpen, FaReply, FaUsers } from 'react-icons/fa6';
import type { ThreadSummary, MessagesListLabels } from '../messagesPage.types';
import { buildMessageMetaMain, toPriority } from '../services/messagesThreadHelpers.service';

type MessagesThreadListProps = {
  sortedThreads: ThreadSummary[];
  selectedRootId: number | null;
  userId?: number;
  lang: 'he' | 'en';
  userNamesById: Record<number, string>;
  labels: MessagesListLabels;
  onOpenThread: (rootId: number) => void;
};

export function MessagesThreadList(props: MessagesThreadListProps) {
  const { sortedThreads, selectedRootId, userId, lang, userNamesById, labels, onOpenThread } = props;

  return (
    <aside className="messages-list" aria-label="Messages list">
      {sortedThreads.map(({ rootId, thread, lastMessage }) => {
        const isUnread =
          userId !== undefined &&
          lastMessage.recipientIds.includes(userId) &&
          !lastMessage.readByIds.includes(userId);

        const metaMain = buildMessageMetaMain(lastMessage, {
          lang,
          userId,
          userNamesById,
        });

        return (
          <button
            key={rootId}
            type="button"
            className={`messages-list__item${isUnread ? ' messages-list__item--unread' : ''}${selectedRootId === rootId ? ' is-active' : ''}`}
            onClick={() => onOpenThread(rootId)}
          >
            <div className="messages-list__icon">
              {thread.length > 1 ? <FaReply /> : isUnread ? <FaEnvelope /> : <FaEnvelopeOpen />}
            </div>
            <div className="messages-list__content">
              <div className="messages-badges-row">
                <span className={`messages-priority messages-priority--${toPriority(lastMessage.priority).toLowerCase()}`}>
                  {labels.priority[toPriority(lastMessage.priority)]}
                </span>
                {lastMessage.recipientIds.length > 1 ? (
                  <span className="messages-recipient-badge" title={labels.multiRecipient}>
                    <FaUsers />
                    <span>{lastMessage.recipientIds.length}</span>
                  </span>
                ) : null}
              </div>
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
  );
}
