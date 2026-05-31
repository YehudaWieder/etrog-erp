import { useEffect, useMemo, useState } from 'react';
import { deleteMessage, fetchAllMessages, markMessageAsRead, type Message } from '../../../services/messagesApi';
import { getAllProfiles, getCurrentUser } from '../../../services/authService';
import type { MailboxCounts, MessagesListLabels, SidebarFilter, ThreadSummary } from '../messagesPage.types';
import { createMessagesListLabels } from '../services/messagesListLabels.service';
import { printMessagesThread } from '../services/messagesPrint.service';
import { findThreadRootId } from '../services/messagesThreadHelpers.service';

export function useMessagesMailboxData(params: {
  filter: SidebarFilter;
  userId?: number;
  lang: 'he' | 'en';
  initialOpenMessageId?: number;
  refreshKey: number;
  onCountsChange?: (counts: MailboxCounts) => void;
  onUnreadCountChange?: (count: number) => void;
  onActionFeedback?: (text: string) => void;
}) {
  const {
    filter,
    userId,
    lang,
    initialOpenMessageId,
    refreshKey,
    onCountsChange,
    onUnreadCountChange,
    onActionFeedback,
  } = params;

  const currentUser = getCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<number, string>>({});
  const [recipientOptions, setRecipientOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [markingAsReadIds, setMarkingAsReadIds] = useState<number[]>([]);

  const labels = useMemo<MessagesListLabels>(() => createMessagesListLabels(lang), [lang]);

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
        setRecipientOptions(profiles.filter((profile) => profile.id !== currentUser?.id).map((profile) => ({ id: profile.id, name: profile.name })));
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
    onUnreadCountChange?.(counts['unread-messages']);
  }, [counts, onCountsChange, onUnreadCountChange]);

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

        if (selectedRootId !== null) {
          return findThreadRootId(msg, byId) === selectedRootId;
        }

        return false;
      });
    }

    return userMessages;
  }, [byId, filter, selectedRootId, userId, userMessages]);

  const sortedThreads = useMemo<ThreadSummary[]>(() => {
    const threadMap: Record<number, Message[]> = {};

    for (const msg of filteredMessages) {
      const rootId = findThreadRootId(msg, byId);
      if (!threadMap[rootId]) {
        threadMap[rootId] = [];
      }
      threadMap[rootId].push(msg);
    }

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
  }, [filteredMessages, byId]);

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

    return userMessages
      .filter((msg) => findThreadRootId(msg, byId) === selectedRootId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [byId, selectedRootId, userMessages]);

  const selectedSubject = selectedThreadMessages[0]?.subject ?? '';

  const handleThreadOpen = async (rootId: number) => {
    setSelectedRootId(rootId);

    if (userId === undefined) {
      return;
    }

    const threadMessages = userMessages.filter((msg) => findThreadRootId(msg, byId) === rootId);
    const unreadIncoming = threadMessages.filter(
      (msg) =>
        msg.recipientIds.includes(userId) &&
        !msg.readByIds.includes(userId) &&
        !markingAsReadIds.includes(msg.id),
    );

    if (!unreadIncoming.length) {
      return;
    }

    const newMarkingIds = unreadIncoming.map((msg) => msg.id);
    setMarkingAsReadIds((prev) => [...prev, ...newMarkingIds]);

    try {
      await Promise.all(unreadIncoming.map((msg) => markMessageAsRead(msg.id)));
      setMessages((prev) =>
        prev.map((msg) => {
          if (!unreadIncoming.some((unreadMessage) => unreadMessage.id === msg.id) || msg.readByIds.includes(userId)) {
            return msg;
          }
          return {
            ...msg,
            readByIds: [...msg.readByIds, userId],
          };
        }),
      );
    } finally {
      setMarkingAsReadIds((prev) => prev.filter((id) => !newMarkingIds.includes(id)));
    }
  };

  useEffect(() => {
    if (!initialOpenMessageId || !sortedThreads.length) {
      return;
    }

    const targetMessage = userMessages.find((message) => message.id === initialOpenMessageId);
    if (!targetMessage) {
      return;
    }

    const targetRootId = findThreadRootId(targetMessage, byId);
    const targetThread = sortedThreads.find((thread) => thread.rootId === targetRootId);
    if (!targetThread) {
      return;
    }

    void handleThreadOpen(targetRootId);
  }, [initialOpenMessageId, sortedThreads, userMessages, byId]);

  const handleDelete = async (message: Message) => {
    if (!userId || message.senderId !== userId || deletingMessageId !== null) {
      return;
    }

    try {
      setDeletingMessageId(message.id);
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      onActionFeedback?.(labels.actions.deleteNotice);
    } catch (errorObject: unknown) {
      let errorMessage = labels.actions.deleteError;

      if (
        typeof errorObject === 'object' &&
        errorObject !== null &&
        'message' in errorObject &&
        typeof errorObject.message === 'string' &&
        (errorObject.message.includes('replies') || errorObject.message.includes('Cannot delete a message that has replies'))
      ) {
        errorMessage = labels.compose.deleteWithReplies;
      }

      onActionFeedback?.(errorMessage);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const appendCreatedMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handlePrintThread = () => {
    printMessagesThread({
      messages: selectedThreadMessages,
      selectedSubject,
      lang,
      userId,
      userNamesById,
      labels,
    });
  };

  return {
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
  };
}
