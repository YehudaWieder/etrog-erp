import { FaPrint, FaReply, FaShareFromSquare, FaTrashCan, FaUsers } from 'react-icons/fa6';
import type { Message } from '../../../services/messagesApi';
import { getReplyAllRecipientIds } from '../services/messagesThreadHelpers.service';
import type { MessagesListLabels } from '../messagesPage.types';
import styles from './styles/MessagesFeature.module.css';

type MessagesThreadToolbarProps = {
  message: Message;
  userId?: number;
  deletingMessageId: number | null;
  labels: MessagesListLabels;
  onPrint: () => void;
  onReply: (message: Message) => void;
  onReplyAll: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
};

export function MessagesThreadToolbar(props: MessagesThreadToolbarProps) {
  const {
    message,
    userId,
    deletingMessageId,
    labels,
    onPrint,
    onReply,
    onReplyAll,
    onForward,
    onDelete,
  } = props;

  const isOutgoing = userId !== undefined && message.senderId === userId;
  const canReplyAll = getReplyAllRecipientIds(message, userId).length > 1;

  return (
    <>
      <button
        type="button"
        className={`${styles.threadAction} ${styles.threadActionIcon}`}
        onClick={onPrint}
        aria-label={labels.actions.print}
        title={labels.actions.print}
      >
        <FaPrint />
      </button>
      <button
        type="button"
        className={`${styles.threadAction} ${styles.threadActionIcon}`}
        onClick={() => onReply(message)}
        aria-label={labels.actions.reply}
        title={labels.actions.reply}
      >
        <FaReply />
      </button>
      {canReplyAll ? (
        <button
          type="button"
          className={`${styles.threadAction} ${styles.threadActionIcon}`}
          onClick={() => onReplyAll(message)}
          aria-label={labels.actions.replyAll}
          title={labels.actions.replyAll}
        >
          <FaUsers />
        </button>
      ) : null}
      <button
        type="button"
        className={`${styles.threadAction} ${styles.threadActionIcon}`}
        onClick={() => onForward(message)}
        aria-label={labels.actions.forward}
        title={labels.actions.forward}
      >
        <FaShareFromSquare />
      </button>
      {isOutgoing ? (
        <button
          type="button"
          className={`${styles.threadAction} ${styles.threadActionIcon} ${styles.threadActionDanger}`}
          onClick={() => onDelete(message)}
          disabled={deletingMessageId === message.id}
          aria-label={deletingMessageId === message.id ? labels.actions.deleting : labels.actions.delete}
          title={deletingMessageId === message.id ? labels.actions.deleting : labels.actions.delete}
        >
          <FaTrashCan />
        </button>
      ) : null}
    </>
  );
}
