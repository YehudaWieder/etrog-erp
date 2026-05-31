import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';

export class MessageFilterQueryDto {
  @ApiPropertyOptional({ description: 'Filter by sender user ID.', example: 5 })
  senderId?: string;

  @ApiPropertyOptional({
    enum: Priority,
    enumName: 'Priority',
    description: 'Filter by priority level.',
  })
  priority?: string;

  @ApiPropertyOptional({
    description: 'Filter by parent message ID. Pass 0 to get top-level messages only.',
    example: 0,
  })
  replyToMessageId?: string;

  @ApiPropertyOptional({
    description: 'true = read messages only, false = unread messages only.',
    example: 'true',
  })
  isRead?: string;

  @ApiPropertyOptional({
    enum: ['inbox', 'outbox', 'all'],
    description: 'Filter by message box: inbox, outbox, or all (default).',
  })
  box?: string;
}
