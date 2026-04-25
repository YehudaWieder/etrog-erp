// src/messages/messages.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { Prisma } from '@prisma/client';
import { MessageSwaggerDto } from 'src/docs/dto/swagger-enums.dto';

@ApiTags('Messages')
@ApiBearerAuth('access-token')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new internal message from one user to another' })
  @ApiBody({ type: MessageSwaggerDto })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid message data.' })
  sendMessage(@Body() data: Prisma.MessageUncheckedCreateInput) {
    return this.messagesService.sendMessage(data);
  }

  @Get('inbox/:userId')
  @ApiOperation({ summary: 'Retrieve the inbox (received messages) for a specific user' })
  @ApiParam({ name: 'userId', type: Number, description: 'The ID of the recipient user.' })
  @ApiResponse({ status: 200, description: 'Inbox messages returned successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getInbox(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getInbox(userId);
  }

  @Get('outbox/:userId')
  @ApiOperation({ summary: 'Retrieve the outbox (sent messages) for a specific user' })
  @ApiParam({ name: 'userId', type: Number, description: 'The ID of the sender user.' })
  @ApiResponse({ status: 200, description: 'Outbox messages returned successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getOutbox(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getOutbox(userId);
  }

  @Get('unread-count/:userId')
  @ApiOperation({ summary: 'Get the count of unread messages in the inbox of a specific user' })
  @ApiParam({ name: 'userId', type: Number, description: 'The ID of the user.' })
  @ApiResponse({ status: 200, description: 'Unread message count returned.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUnreadCount(@Param('userId', ParseIntPipe) userId: number) {
    return this.messagesService.getUnreadCount(userId);
  }

  @Patch(':id/read/:userId')
  @ApiOperation({ summary: 'Mark a specific message as read by the recipient user' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the message to mark as read.' })
  @ApiParam({ name: 'userId', type: Number, description: 'The ID of the user marking the message as read.' })
  @ApiResponse({ status: 200, description: 'Message marked as read successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.markAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a message by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the message to delete.' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  deleteMessage(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.deleteMessage(id);
  }
}