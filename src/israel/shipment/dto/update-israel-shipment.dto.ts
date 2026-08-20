import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class UpdateIsraelShipmentDto {
  @ApiProperty({ description: 'ID of the shipment to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Sequential shipment number, unique within the season.', example: 1 })
  shipmentNumber?: number;

  @ApiPropertyOptional({ description: 'Shipment status.', enum: ShipmentStatus })
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Date the shipment left, required when status is SHIPPED.' })
  shippedAt?: string | null;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string | null;
}
