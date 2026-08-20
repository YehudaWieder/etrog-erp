import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export class PackIsraelShipmentItemRowDto {
  @ApiProperty({ description: 'Israel sort category for this item.', example: 1 })
  categoryId!: number;

  @ApiProperty({ description: 'Grade, must be supported by the chosen category.', enum: Grade })
  grade!: Grade;

  @ApiProperty({ description: 'Pitam status.', enum: PitamStatus })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Quantity to pack.', example: 20 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}

export class PackIsraelShipmentItemsDto {
  @ApiProperty({ description: 'Box to pack these items into. Must be OPEN.', example: 1 })
  boxId!: number;

  @ApiProperty({ description: 'Items to pack, created atomically in a single transaction.', type: [PackIsraelShipmentItemRowDto] })
  items!: PackIsraelShipmentItemRowDto[];
}
