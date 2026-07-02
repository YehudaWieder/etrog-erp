import { ApiProperty } from '@nestjs/swagger';

export class CreateBoxesBulkDto {
  @ApiProperty({ description: 'Shipment ID to place the boxes in.', example: 15 })
  shipmentId!: number;

  @ApiProperty({ description: 'First box number in the range (inclusive).', example: 100 })
  startNumber!: number;

  @ApiProperty({ description: 'Last box number in the range (inclusive).', example: 150 })
  endNumber!: number;
}
