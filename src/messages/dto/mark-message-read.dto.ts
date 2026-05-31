import { ApiProperty } from '@nestjs/swagger';

export class MarkMessageReadDto {
  @ApiProperty({ description: 'Message ID to mark as read.', example: 1 })
  id!: number;
}
