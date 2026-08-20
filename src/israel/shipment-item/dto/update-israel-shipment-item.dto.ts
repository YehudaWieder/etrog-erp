import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIsraelShipmentItemDto {
  @ApiProperty({ description: 'ID of the shipment item to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'New quantity. Must not exceed available stock for this item\'s category/grade/pitam status.', example: 25 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string | null;
}
