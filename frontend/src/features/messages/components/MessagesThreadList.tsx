import { FaEnvelope, FaEnvelopeOpen, FaReply, FaUsers } from 'react-icons/fa6';
import type { ThreadSummary, MessagesListLabels } from '../messagesPage.types';
import { buildMessageMetaMain, toPriority } from '../services/messagesThreadHelpers.service';
import styles from './styles/MessagesFeature.module.css';

const PRIORITY_CLASS_BY_VALUE = {
  LOW: styles.priorityLow,
  NORMAL: styles.priorityNormal,
  HIGH: styles.priorityHigh,
  URGENT: styles.priorityUrgent,
} as const;

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
    <aside className={styles.list} aria-label="Messages list">
      {sortedThreads.map(({ rootId, thread, lastMessage }) => {
        const isUnread =
          userId !== undefined &&
          lastMessage.recipientIds.includes(userId) &&
          !lastMessage.readByIds.includes(userId);

        const metaMain = buildMessageMetaMain(lastMessage, {
          lang,
          userId,
          userNamesById,
          labels: labels.threadMeta,
        });

        const priority = toPriority(lastMessage.priority);

        return (
          <button
            key={rootId}
            type="button"
            className={`${styles.listItem}${isUnread ? ` ${styles.listItemUnread}` : ''}${selectedRootId === rootId ? ` ${styles.listItemActive}` : ''}`}
            onClick={() => onOpenThread(rootId)}
          >
            <div className={styles.listIcon}>
              {thread.length > 1 ? <FaReply /> : isUnread ? <FaEnvelope /> : <FaEnvelopeOpen />}
            </div>
            <div className={styles.listContent}>
              <div className={styles.badgesRow}>
                <span className={`${styles.priority} ${PRIORITY_CLASS_BY_VALUE[priority]}`}>
                  {labels.priority[priority]}
                </span>
                {lastMessage.recipientIds.length > 1 ? (
                  <span className={styles.recipientBadge} title={labels.multiRecipient}>
                    <FaUsers />
                    <span>{lastMessage.recipientIds.length}</span>
                  </span>
                ) : null}
              </div>
              <div className={styles.listMeta}>
                {metaMain.tooltip ? (
                  <span className={styles.metaTooltip} data-tooltip={metaMain.tooltip}>
                    {metaMain.text}
                  </span>
                ) : (
                  <span>{metaMain.text}</span>
                )}
                <span>{new Date(lastMessage.createdAt).toLocaleString()}</span>
              </div>
              <div className={styles.listSubject}>{lastMessage.subject}</div>
              <div className={styles.listPreview}>
                {lastMessage.content.slice(0, 90)}
                {lastMessage.content.length > 90 ? '...' : ''}
              </div>
              {thread.length > 1 ? (
                <div className={styles.listThreadCount}>
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
