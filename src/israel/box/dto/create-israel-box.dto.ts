import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIsraelBoxDto {
  @ApiProperty({ description: 'Season this box belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Sequential box number, unique within the season.', example: 1 })
  boxNumber!: number;

  @ApiPropertyOptional({ description: 'Shipment to attach this box to. Optional — boxes may exist unassigned until packed.', example: 1 })
  shipmentId?: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
