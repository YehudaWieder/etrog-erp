import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerAllocationAdjustmentDto {
  @ApiProperty({ description: 'Customer allocation adjustment ID.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated quantity.', example: 9 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Updated after recount' })
  notes?: string | null;
}
