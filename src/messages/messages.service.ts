// src/messages/messages.service.ts

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

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

  // Permanently deletes a message from the database. Only the sender can delete.
  async deleteMessage(id: number, actorId: number) {
    const message = await this.prisma.message.findUnique({ where: { id } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== actorId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    return this.prisma.message.delete({
      where: { id },
    });
  }
}