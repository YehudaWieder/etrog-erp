import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIsraelShipmentDto {
  @ApiProperty({ description: 'Season this shipment belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Sequential shipment number, unique within the season.', example: 1 })
  shipmentNumber!: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
