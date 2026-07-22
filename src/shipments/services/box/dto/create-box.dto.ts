import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoxOwnership, BoxStatus, BoxType } from '@prisma/client';

export class CreateBoxDto {
  @ApiProperty({ description: 'Shipment ID to place the box in.', example: 15 })
  shipmentId!: number;

  @ApiProperty({ description: 'Box sequence number within the shipment.', example: 3 })
  boxNumber!: number;

  @ApiPropertyOptional({
    enum: BoxType,
    enumName: 'BoxType',
    description: 'Physical box type. Required unless ownershipType=EXTERNAL_TRADER, which defaults to SMALL.',
    example: 'MEDIUM',
  })
  boxType?: BoxType;

  @ApiPropertyOptional({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Box status. Defaults to OPEN.', example: 'OPEN' })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Optional notes.', example: 'Dedicated box for trader 3' })
  notes?: string;

  @ApiPropertyOptional({
    enum: BoxOwnership,
    enumName: 'BoxOwnership',
    description:
      'Ownership model. Defaults to GENERAL. TRADER requires traderId, CUSTOMER requires customerId, EXTERNAL_TRADER requires externalOwnerName.',
    example: 'TRADER',
  })
  ownershipType?: BoxOwnership;

  @ApiPropertyOptional({ description: 'Required when ownershipType=TRADER.', example: 3 })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Required when ownershipType=CUSTOMER.', example: null })
  customerId?: number;

  @ApiPropertyOptional({ description: 'Required when ownershipType=EXTERNAL_TRADER.', example: 'Yosef Cohen' })
  externalOwnerName?: string;
}
