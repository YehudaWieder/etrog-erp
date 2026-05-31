import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ description: 'Recipient user IDs.', example: [4] })
  recipientIds!: number[];

  @ApiProperty({ description: 'Message subject.', example: 'Packing completed' })
  subject!: string;

  @ApiProperty({ description: 'Message content.', example: 'Shipment #102 is ready for dispatch.' })
  content!: string;

  @ApiPropertyOptional({
    enum: Priority,
    enumName: 'Priority',
    description: 'Priority level. Defaults to NORMAL when omitted.',
    example: Priority.NORMAL,
  })
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Parent message ID for replies.', example: 12 })
  replyToMessageId?: number;
}
