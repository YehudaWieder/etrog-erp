import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, MovementType, PitamStatus } from 'src/generated/prisma';

export class CreateTraderStockMovementDto {
  @ApiProperty({ description: 'Movement date-time.', example: '2026-10-08T08:30:00.000Z' })
  date!: Date | string;

  @ApiPropertyOptional({ description: 'Optional Hebrew date.', example: 'טז תשרי תשפז' })
  dateHebrew?: string | null;

  @ApiPropertyOptional({ description: 'Trader ID. Null/omitted for modulo.', example: 3 })
  traderId?: number | null;

  @ApiProperty({ description: 'Trader category ID.', example: 2 })
  traderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade!: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Movement quantity.', example: 200 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Modulo flag for general pool movements.', example: false })
  isModulo?: boolean;

  @ApiProperty({
    enum: MovementType,
    enumName: 'MovementType',
    description: 'Movement type.',
  })
  type!: MovementType;

  @ApiPropertyOptional({ description: 'Optional movement notes.', example: 'Inbound from sorting line' })
  notes?: string | null;
}
