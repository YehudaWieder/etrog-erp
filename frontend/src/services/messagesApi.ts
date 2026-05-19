import { apiClient } from './apiClient';

export type Message = {
  id: number;
  senderId: number;
  sender: { id: number; name: string };
  recipientIds: number[];
  readByIds: number[];
  replyToMessageId?: number | null;
  replyToMessage?: { id: number; subject: string; senderId: number } | null;
  subject: string;
  content: string;
  priority: string;
  createdAt: string;
};

export type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type SendMessagePayload = {
  recipientIds: number[];
  subject: string;
  content: string;
  priority: MessagePriority;
  replyToMessageId?: number;
};

export async function fetchAllMessages(): Promise<Message[]> {
  return apiClient<Message[]>('/messages/all');
}

export async function fetchInboxMessages(): Promise<Message[]> {
  return apiClient<Message[]>('/messages/inbox');
}

export async function fetchOutboxMessages(): Promise<Message[]> {
  return apiClient<Message[]>('/messages/outbox');
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const response = await apiClient<number | { count?: number }>('/messages/unread-count');

  if (typeof response === 'number') {
    return { count: response };
  }

  return { count: typeof response?.count === 'number' ? response.count : 0 };
}

export async function fetchThread(messageId: number): Promise<Message[]> {
  // Use the filter endpoint to get a thread by replyToMessageId
  return apiClient<Message[]>(`/messages/filter?replyToMessageId=${messageId}`);
}

export async function deleteMessage(id: number): Promise<void> {
  await apiClient(`/messages/${id}`, {
    method: 'DELETE',
  });
}

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  return apiClient<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function markMessageAsRead(id: number): Promise<Message> {
  return apiClient<Message>('/messages/read', {
    method: 'PATCH',
    body: JSON.stringify({ id }),
  });
}
