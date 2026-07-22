import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTraderDto {
  @ApiProperty({ description: 'Trader ID to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated unique trader name.', example: 'Trader Levi' })
  name?: string;
}
