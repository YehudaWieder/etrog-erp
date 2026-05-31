import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTraderStockAdjustmentDto {
  @ApiProperty({ description: 'Trader stock adjustment ID.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated quantity.', example: 10 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Updated after recount' })
  notes?: string | null;
}
