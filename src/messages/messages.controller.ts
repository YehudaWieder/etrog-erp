// src/messages/messages.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Prisma } from '@prisma/client';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Endpoint to send a new message, accepting the message data in the request body.
  @Post()
  sendMessage(@Body() data: Prisma.MessageUncheckedCreateInput) {
    return this.messagesService.sendMessage(data);
  }

  // Get inbox for a specific user.
  @Get('inbox/:userId')
  getInbox(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getInbox(userId);
  }

  // Get outbox for a specific user.
  @Get('outbox/:userId')
  getOutbox(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getOutbox(userId);
  }

  // Get the count of unread messages for a specific user.
  @Get('unread-count/:userId')
  getUnreadCount(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getUnreadCount(userId);
  }

  // Mark a specific message as read.
  @Patch(':id/read/:userId')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.markAsRead(id, userId);
  }

  // Permanently delete a specific message.
  @Delete(':id')
  deleteMessage(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.deleteMessage(id);
  }
}