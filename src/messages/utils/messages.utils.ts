import { BadRequestException } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { MessageFilterQueryDto } from '../dto/message-filter-query.dto';
import { SendMessageDto } from '../dto/send-message.dto';

export type MessageBox = 'inbox' | 'outbox' | 'all';

export interface MessageFilterOptions {
  senderId?: number;
  priority?: Priority;
  replyToMessageId?: number | null;
  isRead?: boolean;
  box?: MessageBox;
}

export const MESSAGE_INCLUDE = {
  sender: { select: { id: true, name: true } },
  replyToMessage: { select: { id: true, subject: true, senderId: true } },
} satisfies Prisma.MessageInclude;

export function parseMessageFilterQuery(query: MessageFilterQueryDto): MessageFilterOptions {
  const senderId = parseOptionalPositiveInt(query.senderId, 'senderId');

  const replyToMessageId =
    query.replyToMessageId !== undefined
      ? parseReplyToMessageId(query.replyToMessageId)
      : undefined;

  const isRead = query.isRead !== undefined ? parseBooleanString(query.isRead, 'isRead') : undefined;

  const parsedPriority =
    query.priority !== undefined ? parsePriority(query.priority) : undefined;

  const parsedBox = query.box !== undefined ? parseMessageBox(query.box) : undefined;

  return {
    senderId,
    priority: parsedPriority,
    replyToMessageId,
    isRead,
    box: parsedBox,
  };
}

export function validateSendMessageInput(data: SendMessageDto): void {
  if (!Array.isArray(data.recipientIds) || data.recipientIds.length === 0) {
    throw new BadRequestException('recipientIds must contain at least one recipient');
  }

  for (const recipientId of data.recipientIds) {
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      throw new BadRequestException('Each recipient ID must be a positive integer');
    }
  }

  if (typeof data.subject !== 'string' || data.subject.trim() === '') {
    throw new BadRequestException('subject is required');
  }

  if (typeof data.content !== 'string' || data.content.trim() === '') {
    throw new BadRequestException('content is required');
  }

  if (data.priority !== undefined && !Object.values(Priority).includes(data.priority)) {
    throw new BadRequestException('priority is invalid');
  }

  if (data.replyToMessageId !== undefined && (!Number.isInteger(data.replyToMessageId) || data.replyToMessageId <= 0)) {
    throw new BadRequestException('replyToMessageId must be a positive integer');
  }
}

export function buildVisibleMessagesWhere(userId: number, box?: MessageBox): Prisma.MessageWhereInput {
  if (box === 'inbox') {
    return { recipientIds: { has: userId } };
  }

  if (box === 'outbox') {
    return { senderId: userId };
  }

  return { OR: [{ senderId: userId }, { recipientIds: { has: userId } }] };
}

function parseOptionalPositiveInt(raw: string | undefined, field: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }

  return parsed;
}

function parseReplyToMessageId(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new BadRequestException('replyToMessageId must be a non-negative integer');
  }

  return parsed === 0 ? null : parsed;
}

function parseBooleanString(raw: string, fieldName: string): boolean {
  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new BadRequestException(`${fieldName} must be either true or false`);
}

function parsePriority(raw: string): Priority {
  if (!Object.values(Priority).includes(raw as Priority)) {
    throw new BadRequestException('priority is invalid');
  }

  return raw as Priority;
}

function parseMessageBox(raw: string): MessageBox {
  if (raw === 'inbox' || raw === 'outbox' || raw === 'all') {
    return raw;
  }

  throw new BadRequestException('box must be one of: inbox, outbox, all');
}
