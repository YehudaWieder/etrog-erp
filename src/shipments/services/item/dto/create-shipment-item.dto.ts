import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, ItemOwnership, PitamStatus } from '@prisma/client';

export class CreateShipmentItemDto {
  @ApiProperty({ description: 'Box ID.' })
  boxId!: number;

  @ApiPropertyOptional({ description: 'Trader category ID.' })
  traderCategoryId?: number;

  @ApiPropertyOptional({ description: 'Customer category ID.' })
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade', description: 'Etrog grade.' })
  grade?: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status.' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Item quantity.' })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;

  @ApiPropertyOptional({ enum: ItemOwnership, enumName: 'ItemOwnership', description: 'Ownership model for item.' })
  ownershipType?: ItemOwnership;

  @ApiPropertyOptional({ description: 'Trader ID when ownership is trader-based.' })
  traderId?: number;

  @ApiPropertyOptional({ description: 'Customer ID when ownership is customer-based.' })
  customerId?: number;

  @ApiPropertyOptional({ description: 'When true, item is packed from the trader\'s PRIVATE_SELECTION stock rather than general inventory.' })
  isPrivateSelection?: boolean;
}
