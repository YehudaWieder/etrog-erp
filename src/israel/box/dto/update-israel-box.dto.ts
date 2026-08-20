import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoxStatus } from '@prisma/client';

export class UpdateIsraelBoxDto {
  @ApiProperty({ description: 'ID of the box to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Sequential box number, unique within the season.', example: 1 })
  boxNumber?: number;

  @ApiPropertyOptional({ description: 'Shipment to attach this box to, or null to unassign it.', example: 1, nullable: true })
  shipmentId?: number | null;

  @ApiPropertyOptional({ description: 'Box status.', enum: BoxStatus })
  status?: BoxStatus;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string | null;
}
