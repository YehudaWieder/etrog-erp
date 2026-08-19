import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIsraelStockMovementDto {
  @ApiPropertyOptional({
    description: 'Updated quantity, sent as a positive number.',
    example: 8,
  })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
