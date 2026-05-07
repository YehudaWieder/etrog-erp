// src/messages/messages.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, ParseBoolPipe, Req, Query, ParseEnumPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { Prisma, Priority } from '@prisma/client';
import { MessageSwaggerDto, MessageFilterDto } from 'src/docs/dto/swagger-enums.dto';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Messages')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT authentication failed or token is missing.' })
@ApiForbiddenResponse({ description: 'Access denied due to insufficient role or inactive user.' })
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new internal message from one user to another' })
  @ApiBody({
    type: MessageSwaggerDto,
    examples: {
      default: {
        summary: 'Send message payload',
        value: {
          recipientIds: [4],
          subject: 'Packing completed',
          content: 'Shipment #102 is ready for dispatch.',
          priority: 'NORMAL',
        },
      },
      urgent: {
        summary: 'Urgent message payload',
        value: {
          recipientIds: [2],
          subject: 'Quality alert',
          content: 'Please review rejected batch from field 3 immediately.',
          priority: 'URGENT',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid message data.' })
  sendMessage(@Body() data: Prisma.MessageUncheckedCreateInput, @Req() req: Request) {
    return this.messagesService.sendMessage(data, req.user as AuthenticatedUser);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Retrieve the inbox (received messages) for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Inbox messages returned successfully.' })
  getInbox(@Req() req: Request) {
    return this.messagesService.getInbox((req.user as AuthenticatedUser).id);
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Retrieve the outbox (sent messages) for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Outbox messages returned successfully.' })
  getOutbox(@Req() req: Request) {
    return this.messagesService.getOutbox((req.user as AuthenticatedUser).id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Retrieve all messages (inbox and outbox) for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All messages returned successfully.' })
  getAllMessages(@Req() req: Request) {
    return this.messagesService.getAllMessages((req.user as AuthenticatedUser).id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the count of unread messages in the inbox of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Unread message count returned.' })
  getUnreadCount(@Req() req: Request) {
    return this.messagesService.getUnreadCount((req.user as AuthenticatedUser).id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific message as read by the authenticated user' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the message to mark as read.' })
  @ApiResponse({ status: 200, description: 'Message marked as read successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.messagesService.markAsRead(id, (req.user as AuthenticatedUser).id);
  }
  
  @Get('filter')
  @ApiOperation({ summary: 'Retrieve messages for the authenticated user filtered by sender, priority, thread, or read status' })
  @ApiQuery({ name: 'senderId', required: false, type: Number, description: 'Filter by sender user ID.' })
  @ApiQuery({ name: 'priority', required: false, enum: Priority, description: 'Filter by priority level.' })
  @ApiQuery({ name: 'replyToMessageId', required: false, type: Number, description: 'Filter by parent message ID. Pass 0 to get top-level messages only.' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, description: 'true = read messages only, false = unread messages only.' })
  @ApiQuery({ name: 'box', required: false, enum: ['inbox', 'outbox', 'all'], description: 'Filter by message box: inbox, outbox, or all (default).' })
  @ApiResponse({ status: 200, description: 'Filtered messages returned successfully.' })
  getFiltered(
    @Req() req: Request,
    @Query('senderId') senderIdRaw?: string,
    @Query('priority') priority?: string,
    @Query('replyToMessageId') replyToIdRaw?: string,
    @Query('isRead') isReadRaw?: string,
    @Query('box') box?: string,
  ) {
    const userId = (req.user as AuthenticatedUser).id;

    const senderId = senderIdRaw !== undefined ? parseInt(senderIdRaw, 10) : undefined;
    const replyToMessageId = replyToIdRaw !== undefined
      ? (parseInt(replyToIdRaw, 10) === 0 ? null : parseInt(replyToIdRaw, 10))
      : undefined;
    const isRead = isReadRaw !== undefined ? isReadRaw === 'true' : undefined;
    const parsedPriority = priority !== undefined && Object.values(Priority).includes(priority as Priority)
      ? (priority as Priority)
      : undefined;
    const parsedBox = box === 'inbox' || box === 'outbox' || box === 'all' ? box : undefined;

    return this.messagesService.getFiltered(userId, {
      senderId,
      priority: parsedPriority,
      replyToMessageId,
      isRead,
      box: parsedBox,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a message by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID of the message to delete.' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Message not found.' })
  @ApiResponse({ status: 403, description: 'Only the sender can delete this message.' })
  deleteMessage(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.messagesService.deleteMessage(id, (req.user as AuthenticatedUser).id);
  }
}
