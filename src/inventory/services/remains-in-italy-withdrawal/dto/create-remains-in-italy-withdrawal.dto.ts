import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export type RemainsInItalyDestinationType = 'TRADER' | 'CUSTOMER' | 'GENERAL';

// Withdraws a quantity from the REMAINS_IN_ITALY bucket (traderId: null, isModulo: false) and routes
// it to a destination. TRADER/CUSTOMER go directly into that owner's stock as a HARVEST_IN entry;
// GENERAL re-runs the same trader-share split every GENERAL classification goes through
// (GeneralShareAllocationService.allocateGeneralQuantity). See remains-in-italy-withdrawal.service.ts.
export class CreateRemainsInItalyWithdrawalDto {
  @ApiProperty({ description: 'Trader category the remains-in-Italy stock belongs to.' })
  traderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade' })
  grade!: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Quantity to withdraw from the remains-in-Italy bucket.' })
  quantity!: number;

  @ApiProperty({
    enum: ['TRADER', 'CUSTOMER', 'GENERAL'],
    description:
      'TRADER/CUSTOMER require traderId / (customerId + customerCategoryId) respectively. ' +
      'GENERAL requires neither - the quantity is split across every trader in the category by their configured share.',
  })
  destinationType!: RemainsInItalyDestinationType;

  @ApiPropertyOptional({ description: 'Required when destinationType=TRADER.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Required when destinationType=CUSTOMER.' })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Required when destinationType=CUSTOMER.' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ description: 'Movement date. Defaults to now.' })
  date?: string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}
