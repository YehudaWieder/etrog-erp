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
  return apiClient<{ count: number }>('/messages/unread-count');
}

export async function fetchThread(messageId: number): Promise<Message[]> {
  // Use the filter endpoint to get a thread by replyToMessageId
  return apiClient<Message[]>(`/messages/filter?replyToMessageId=${messageId}`);
}
