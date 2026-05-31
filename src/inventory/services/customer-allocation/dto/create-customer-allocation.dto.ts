import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, PitamStatus } from 'src/generated/prisma';

export class CreateCustomerAllocationDto {
  @ApiProperty({ description: 'Allocation date-time.', example: '2026-10-10T09:00:00.000Z' })
  date!: Date | string;

  @ApiPropertyOptional({ description: 'Optional Hebrew date.', example: 'י"ז תשרי תשפ"ז' })
  dateHebrew?: string | null;

  @ApiProperty({ description: 'Customer ID.', example: 5 })
  customerId!: number;

  @ApiProperty({ description: 'Customer category ID.', example: 11 })
  customerCategoryId!: number;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Allocation quantity.', example: 80 })
  quantity!: number;

  @ApiProperty({ enum: MovementType, enumName: 'MovementType', description: 'Movement type.' })
  type!: MovementType;

  @ApiProperty({ description: 'Source descriptor (for example GENERAL).', example: 'GENERAL' })
  takenFrom!: string;

  @ApiPropertyOptional({ description: 'Optional notes.', example: 'Reserved for customer order #A120' })
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Optional source trader ID.', example: 3 })
  traderSourceId?: number | null;
}
