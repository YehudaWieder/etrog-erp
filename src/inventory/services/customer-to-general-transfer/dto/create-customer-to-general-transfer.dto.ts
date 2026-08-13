import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

// Moves a quantity out of a customer's unshipped stock into the GENERAL trader pool - the opposite
// direction of CustomerGeneralTransferService (which moves GENERAL -> CUSTOMER; do not confuse the
// two). In one transaction: creates a single negative customerAllocation anchor row, then either
// fans the quantity out across every trader in traderCategoryId by configured share
// (GeneralShareAllocationService.allocateGeneralQuantity) or, when toRemainsInItaly is true (only
// meaningful for grade Hey/Vav), parks it as a single row in the REMAINS_IN_ITALY bucket instead -
// same pattern as ReclassificationService's source=GENERAL branch. See
// customer-to-general-transfer.service.ts.
export class CreateCustomerToGeneralTransferDto {
  @ApiProperty({ description: 'Customer the stock is taken from.' })
  customerId!: number;

  @ApiProperty({ description: 'Customer category the source stock belongs to.' })
  customerCategoryId!: number;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status of the source customer stock.' })
  pitamStatus!: PitamStatus;

  @ApiPropertyOptional({
    enum: PitamStatus,
    enumName: 'PitamStatus',
    description:
      'Overrides the pitam status the stock lands as on the trader side (e.g. resolving a MIXED customer ' +
      'balance into a definite WITH_PITAM/WITHOUT_PITAM status for the traders). Defaults to pitamStatus when omitted.',
  })
  toPitamStatus?: PitamStatus;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Grade the stock lands as on the trader side.' })
  grade!: Grade;

  @ApiProperty({ description: 'Trader category the quantity is distributed into.' })
  traderCategoryId!: number;

  @ApiProperty({ description: 'Quantity to transfer.' })
  quantity!: number;

  @ApiPropertyOptional({
    description:
      'Only meaningful when grade is Hey or Vav. When true, the quantity is not split across traders by ' +
      'share - it is parked as a single row in the REMAINS_IN_ITALY bucket instead.',
  })
  toRemainsInItaly?: boolean;

  @ApiPropertyOptional({ description: 'Movement date. Defaults to now.' })
  date?: string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}
