import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoxOwnership, BoxStatus, BoxType } from '@prisma/client';

export class UpdateBoxDto {
  @ApiProperty({ description: 'Box ID to update.', example: 101 })
  id!: number;

  @ApiPropertyOptional({ enum: BoxType, enumName: 'BoxType', description: 'Updated physical box type.', example: 'LARGE' })
  boxType?: BoxType;

  @ApiPropertyOptional({ enum: BoxStatus, enumName: 'BoxStatus', description: 'Updated box status.', example: 'CLOSED' })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Updated notes. Can be null to clear.', example: 'Sealed and ready for dispatch' })
  notes?: string | null;

  @ApiPropertyOptional({
    enum: BoxOwnership,
    enumName: 'BoxOwnership',
    description: 'Updated ownership model. TRADER requires traderId, CUSTOMER requires customerId.',
    example: 'CUSTOMER',
  })
  ownershipType?: BoxOwnership;

  @ApiPropertyOptional({ description: 'Required when ownershipType=TRADER. Pass null to clear.', example: null })
  traderId?: number | null;

  @ApiPropertyOptional({ description: 'Required when ownershipType=CUSTOMER. Pass null to clear.', example: 7 })
  customerId?: number | null;
}
