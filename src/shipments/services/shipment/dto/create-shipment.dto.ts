import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Shipment number in the active season.', example: 109 })
  shipmentNumber!: number;

  @ApiPropertyOptional({
    description: 'Optional shipment notes.',
    example: 'Shipment for EU distribution center',
  })
  notes?: string;
}
