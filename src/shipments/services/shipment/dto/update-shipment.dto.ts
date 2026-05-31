import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentDto {
  @ApiProperty({ description: 'Shipment ID to update.', example: 42 })
  id!: number;

  @ApiPropertyOptional({
    enum: ShipmentStatus,
    enumName: 'ShipmentStatus',
    description: 'Updated shipment lifecycle status.',
    example: ShipmentStatus.SHIPPED,
  })
  status?: ShipmentStatus;

  @ApiPropertyOptional({
    description: 'Updated ship date-time in ISO format. Setting this may normalize status to SHIPPED.',
    example: '2026-10-12T13:20:00.000Z',
  })
  shippedAt?: Date | string;

  @ApiPropertyOptional({
    description: 'Updated notes. Can be null to clear notes.',
    example: 'Left warehouse gate at 13:20',
  })
  notes?: string | null;
}
