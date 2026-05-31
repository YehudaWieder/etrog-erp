import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { sendMessage, type Message, type MessagePriority } from '../../../services/messagesApi';
import { getReplyAllRecipientIds } from '../services/messagesThreadHelpers.service';
import type { InlineAction, MessagesListLabels } from '../messagesPage.types';

export function useInlineThreadCompose(params: {
  lang: 'he' | 'en';
  userId?: number;
  userNamesById: Record<number, string>;
  recipientOptions: Array<{ id: number; name: string }>;
  labels: MessagesListLabels;
  onActionFeedback?: (text: string) => void;
  onMessageCreated: (message: Message) => void;
}) {
  const { lang, userId, userNamesById, recipientOptions, labels, onActionFeedback, onMessageCreated } = params;

  const [inlineAction, setInlineAction] = useState<InlineAction | null>(null);
  const [inlineReplyContent, setInlineReplyContent] = useState('');
  const [inlineForwardContent, setInlineForwardContent] = useState('');
  const [inlineForwardRecipients, setInlineForwardRecipients] = useState<number[]>([]);
  const [inlineError, setInlineError] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);

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
    setInlineForwardRecipients((prev) => (prev.includes(recipientId) ? prev : [...prev, recipientId]));
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);

    setTimeout(() => {
      if (recipientInputRef.current) {
        recipientInputRef.current.focus();
      }
    }, 100);
  };

  const removeRecipient = (recipientId: number) => {
    setInlineForwardRecipients((prev) => prev.filter((id) => id !== recipientId));
  };

  const handleRecipientInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

  const closeInlineCompose = () => {
    setInlineAction(null);
    setInlineError('');
  };

  const handleReply = (message: Message) => {
    setInlineAction({ type: 'reply', messageId: message.id });
    setInlineReplyContent('');
    setInlineError('');

    setTimeout(() => {
      const element = document.getElementById(`inline-reply-input-${message.id}`);
      if (element) {
        (element as HTMLTextAreaElement).focus();
      }
    }, 100);
  };

  const handleReplyAll = (message: Message) => {
    setInlineAction({ type: 'reply-all', messageId: message.id });
    setInlineReplyContent('');
    setInlineError('');

    setTimeout(() => {
      const element = document.getElementById(`inline-reply-input-${message.id}`);
      if (element) {
        (element as HTMLTextAreaElement).focus();
      }
    }, 100);
  };

  const handleForward = (message: Message) => {
    setInlineAction({ type: 'forward', messageId: message.id });
    setInlineForwardContent(`\n\n--- ${labels.threadMeta.originalMessage} ---\n${labels.threadMeta.from}: ${message.sender.name}\n${labels.threadMeta.date}: ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}`);
    setInlineForwardRecipients([]);
    setRecipientQuery('');
    setIsRecipientMenuOpen(false);
    setInlineError('');

    setTimeout(() => {
      if (recipientInputRef.current) {
        recipientInputRef.current.focus();
      }
    }, 100);
  };

  const handleInlineReplySend = async (message: Message) => {
    if (!inlineReplyContent.trim()) {
      setInlineError(labels.compose.replyRequired);
      return;
    }

    const replyRecipientIds =
      inlineAction?.type === 'reply-all'
        ? getReplyAllRecipientIds(message, userId)
        : userId !== undefined && message.senderId === userId
          ? message.recipientIds.filter((id) => id !== userId)
          : [message.senderId];

    if (!replyRecipientIds.length) {
      setInlineError(labels.compose.replyRecipientMissing);
      return;
    }

    setInlineLoading(true);
    setInlineError('');

    try {
      const createdMessage = await sendMessage({
        recipientIds: replyRecipientIds,
        subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
        content: inlineReplyContent.trim(),
        priority: message.priority as MessagePriority,
        replyToMessageId: message.id,
      });

      onMessageCreated(createdMessage);
      setInlineAction(null);
      setInlineReplyContent('');
      onActionFeedback?.(inlineAction?.type === 'reply-all' ? labels.compose.replyAllSent : labels.compose.replySent);
    } catch {
      setInlineError(labels.compose.replyFailed);
    } finally {
      setInlineLoading(false);
    }
  };

  const handleInlineForwardSend = async (message: Message) => {
    if (!inlineForwardRecipients.length) {
      setInlineError(labels.compose.forwardRecipientsRequired);
      return;
    }

    if (!inlineForwardContent.trim()) {
      setInlineError(labels.compose.forwardContentRequired);
      return;
    }

    setInlineLoading(true);
    setInlineError('');

    try {
      const createdMessage = await sendMessage({
        recipientIds: inlineForwardRecipients,
        subject: message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`,
        content: inlineForwardContent.trim(),
        priority: message.priority as MessagePriority,
      });

      onMessageCreated(createdMessage);
      setInlineAction(null);
      setInlineForwardContent('');
      setInlineForwardRecipients([]);
      onActionFeedback?.(labels.compose.forwardSent);
    } catch {
      setInlineError(labels.compose.forwardFailed);
    } finally {
      setInlineLoading(false);
    }
  };

  const selectedForwardRecipients = inlineForwardRecipients.map((recipientId) => {
    const recipient = recipientOptions.find((option) => option.id === recipientId);
    return {
      id: recipientId,
      name: recipient?.name || userNamesById[recipientId] || String(recipientId),
    };
  });

  return {
    inlineAction,
    inlineReplyContent,
    inlineForwardContent,
    inlineForwardRecipients,
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
  };
}
