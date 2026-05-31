import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, ItemOwnership, PitamStatus } from '@prisma/client';

export class UpdateShipmentItemDto {
  @ApiProperty({ description: 'Shipment item ID to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated box ID.' })
  boxId?: number;

  @ApiPropertyOptional({ description: 'Updated quantity.', example: 34 })
  quantity?: number;

  @ApiPropertyOptional({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Updated pitam status.' })
  pitamStatus?: PitamStatus;

  @ApiPropertyOptional({ description: 'Updated trader category ID.' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Updated customer category ID.' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade', description: 'Updated grade.' })
  grade?: Grade;

  @ApiPropertyOptional({ enum: ItemOwnership, enumName: 'ItemOwnership', description: 'Updated ownership model.' })
  ownershipType?: ItemOwnership;

  @ApiPropertyOptional({ description: 'Updated trader ID.' })
  traderId?: number | null;

  @ApiPropertyOptional({ description: 'Updated customer ID.' })
  customerId?: number | null;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Adjusted after final packing review' })
  notes?: string | null;
}
