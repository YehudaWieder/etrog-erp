// src/messages/messages.service.ts

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { Priority } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

export interface MessageFilterOptions {
  senderId?: number;
  priority?: Priority;
  /** Pass null to retrieve top-level messages (no parent). Pass a number to retrieve replies of that message. */
  replyToMessageId?: number | null;
  isRead?: boolean;
  /** Filter by message box: 'inbox' (received), 'outbox' (sent), or 'all' (default). */
  box?: 'inbox' | 'outbox' | 'all';
}

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Creates a new message in the database for the authenticated sender.
  async sendMessage(data: Prisma.MessageUncheckedCreateInput, actor: AuthenticatedUser) {
    return this.prisma.message.create({
      data: {
        ...data,
        senderId: actor.id,
      },
      include: {
        sender: { select: { id: true, name: true } },
        replyToMessage: { select: { id: true, subject: true, senderId: true } },
      },
    });
  }

  // Retrieves all messages received by a specific user, ordered by most recent first.
  async getInbox(recipientId: number) {
    return this.prisma.message.findMany({
      where: { recipientIds: { has: recipientId } },
      include: {
        sender: { select: { id: true, name: true } },
        replyToMessage: { select: { id: true, subject: true, senderId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retrieves all messages sent by a specific user.
  async getOutbox(senderId: number) {
    return this.prisma.message.findMany({
      where: { senderId },
      include: {
        sender: { select: { id: true, name: true } },
        replyToMessage: { select: { id: true, subject: true, senderId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retrieves all inbox and outbox messages for a specific user, ordered by most recent first.
  async getAllMessages(userId: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientIds: { has: userId } },
        ],
      },
      include: {
        sender: { select: { name: true, id: true } },
        replyToMessage: { select: { id: true, subject: true, senderId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Marks a specific message as read for a recipient user.
  async markAsRead(id: number, recipientId: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    
    if (!message || !message.recipientIds.includes(recipientId)) {
      throw new NotFoundException('Message not found or unauthorized');
    }

    if (message.readByIds.includes(recipientId)) {
      return message;
    }

    return this.prisma.message.update({
      where: { id },
      data: {
        readByIds: { push: recipientId },
      },
    });
  }

  // Counts the number of unread messages for a specific user.
  async getUnreadCount(recipientId: number) {
    return this.prisma.message.count({
      where: {
        recipientIds: { has: recipientId },
        NOT: { readByIds: { has: recipientId } },
      },
    });
  }

  // Returns messages visible to the user, filtered by any combination of senderId, priority,
  // replyToMessageId (null = top-level only), and read/unread status.
  async getFiltered(userId: number, filters: MessageFilterOptions) {
    let baseWhere: Prisma.MessageWhereInput;
    if (filters.box === 'inbox') {
      baseWhere = { recipientIds: { has: userId } };
    } else if (filters.box === 'outbox') {
      baseWhere = { senderId: userId };
    } else {
      baseWhere = { OR: [{ senderId: userId }, { recipientIds: { has: userId } }] };
    }
    const where: Prisma.MessageWhereInput = { ...baseWhere };

    if (filters.senderId !== undefined) {
      where.senderId = filters.senderId;
    }

    if (filters.priority !== undefined) {
      where.priority = filters.priority;
    }

    if (filters.replyToMessageId !== undefined) {
      where.replyToMessageId = filters.replyToMessageId === null
        ? null
        : filters.replyToMessageId;
    }

    if (filters.isRead === true) {
      where.readByIds = { has: userId };
    } else if (filters.isRead === false) {
      where.NOT = { readByIds: { has: userId } };
    }

    return this.prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        replyToMessage: { select: { id: true, subject: true, senderId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Permanently deletes a message from the database. Only the sender can delete.
  async deleteMessage(id: number, actorId: number) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { replies: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== actorId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    if (message.replies && message.replies.length > 0) {
      throw new ForbiddenException('Cannot delete a message that has replies');
    }

    return this.prisma.message.delete({
      where: { id },
    });
  }
}