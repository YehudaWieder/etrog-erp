import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIsraelBoxesBulkDto {
  @ApiProperty({ description: 'Season these boxes belong to.', example: 1 })
  seasonId!: number;

  @ApiPropertyOptional({ description: 'Shipment to attach the boxes to. Optional — boxes may exist unassigned until packed.', example: 1 })
  shipmentId?: number;

  @ApiProperty({ description: 'First box number in the range.', example: 100 })
  startNumber!: number;

  @ApiProperty({ description: 'Last box number in the range.', example: 150 })
  endNumber!: number;
}
