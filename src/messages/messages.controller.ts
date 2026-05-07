// src/messages/messages.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { Prisma } from '@prisma/client';
import { MessageSwaggerDto } from 'src/docs/dto/swagger-enums.dto';
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
