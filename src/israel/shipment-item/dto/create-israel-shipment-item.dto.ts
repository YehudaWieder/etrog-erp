import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PitamStatus } from '@prisma/client';

export class CreateIsraelShipmentItemDto {
  @ApiProperty({ description: 'Box to pack this item into. Must be OPEN.', example: 1 })
  boxId!: number;

  @ApiProperty({ description: 'Israel sort category for this item.', example: 1 })
  categoryId!: number;

  @ApiProperty({ description: 'Grade, must be supported by the chosen category.' })
  grade!: string;

  @ApiProperty({ description: 'Pitam status.', enum: PitamStatus })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Quantity to pack. Must not exceed available stock for this category/grade/pitam status.', example: 20 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
