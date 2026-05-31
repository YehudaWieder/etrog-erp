import type { Message, MessagePriority } from '../../../services/messagesApi';
import type { MessagesListLabels } from '../messagesPage.types';

export function buildMessageMetaMain(
  message: Message,
  options: { lang: 'he' | 'en'; userId?: number; userNamesById: Record<number, string>; labels: MessagesListLabels['threadMeta'] },
): { text: string; tooltip?: string } {
  const { lang, userId, userNamesById, labels } = options;
  const isOutgoing = userId !== undefined && message.senderId === userId;

  if (!isOutgoing) {
    return {
      text: `${labels.from}: ${message.sender.name}`,
    };
  }

  const recipientNames = message.recipientIds.map((id) => userNamesById[id] || `#${id}`);
  if (recipientNames.length === 0) {
    return { text: labels.toFallback };
  }

  if (recipientNames.length === 1) {
    return {
      text: `${labels.to}: ${recipientNames[0]}`,
      tooltip: recipientNames[0],
    };
  }

  const firstName = recipientNames[0];
  const additionalCount = recipientNames.length - 1;
  const shortText =
    `${labels.to}: ${firstName} +${additionalCount}`;

  return {
    text: shortText,
    tooltip: recipientNames.join(', '),
  };
}

export function toPriority(value: string): MessagePriority {
  if (value === 'LOW' || value === 'NORMAL' || value === 'HIGH' || value === 'URGENT') {
    return value;
  }
  return 'NORMAL';
}

export function findThreadRootId(msg: Message, byId: Map<number, Message>): number {
  let current = msg;
  while (current.replyToMessageId) {
    const parent = byId.get(current.replyToMessageId);
    if (!parent) {
      break;
    }
    current = parent;
  }
  return current.id;
}

export function getReplyAllRecipientIds(message: Message, userId?: number): number[] {
  const participants = [message.senderId, ...message.recipientIds];
  const unique = Array.from(new Set(participants));

  if (userId === undefined) {
    return unique;
  }

  return unique.filter((id) => id !== userId);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function prefixSubject(subject: string, prefix: string): string {
  const trimmed = subject.trim();
  if (!trimmed) {
    return prefix;
  }

  return trimmed.toLowerCase().startsWith(prefix.toLowerCase()) ? trimmed : `${prefix}${trimmed}`;
}
