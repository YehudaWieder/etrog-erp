// src/messages/messages.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Creates a new message in the database, linking it to the sender and recipient.
  async sendMessage(data: Prisma.MessageUncheckedCreateInput) {
    return this.prisma.message.create({
      data,
      include: {
        sender: { select: { name: true, email: true } },
        recipient: { select: { name: true } },
      },
    });
  }

  // Retrieves all messages received by a specific user, ordered by most recent first.
  async getInbox(recipientId: number) {
    return this.prisma.message.findMany({
      where: { recipientId },
      include: {
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retrieves all messages sent by a specific user.
  async getOutbox(senderId: number) {
    return this.prisma.message.findMany({
      where: { senderId },
      include: {
        recipient: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Marks a specific message as read, ensuring only the recipient can perform this action.
  async markAsRead(id: number, recipientId: number) {
    // Ensure only the recipient can mark it as read
    const message = await this.prisma.message.findUnique({ where: { id } });
    
    if (!message || message.recipientId !== recipientId) {
      throw new NotFoundException('Message not found or unauthorized');
    }

    return this.prisma.message.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // Counts the number of unread messages for a specific user.
  async getUnreadCount(recipientId: number) {
    return this.prisma.message.count({
      where: { recipientId, isRead: false },
    });
  }

  // Permanently deletes a message from the database.
  async deleteMessage(id: number) {
    return this.prisma.message.delete({
      where: { id },
    });
  }
}