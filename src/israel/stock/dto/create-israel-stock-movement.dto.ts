import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export type IsraelManualMovementType = 'SELF_PICKUP' | 'WASTE';

export class CreateIsraelStockMovementDto {
  @ApiProperty({ description: 'Season this movement belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({
    description: 'Date of the movement (ISO date-time).',
    example: '2026-01-15T00:00:00.000Z',
  })
  date!: string;

  @ApiProperty({
    description: 'Israel field this movement relates to.',
    example: 1,
  })
  fieldId!: number;

  @ApiProperty({ description: 'Israel sort category.', example: 1 })
  categoryId!: number;

  @ApiProperty({
    enum: Grade,
    description: 'Grade code within the chosen category.',
  })
  grade!: Grade;

  @ApiProperty({
    enum: PitamStatus,
    description: 'Pitam status of the moved stock.',
  })
  pitamStatus!: PitamStatus;

  @ApiProperty({
    description: 'Quantity to move, sent as a positive number.',
    example: 10,
  })
  quantity!: number;

  @ApiProperty({
    enum: ['SELF_PICKUP', 'WASTE'],
    description: 'Type of manual movement.',
  })
  type!: IsraelManualMovementType;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
