import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIsraelSettingsDto {
  @ApiPropertyOptional({ description: 'Carton capacity (units per carton).', example: 120 })
  cartonCapacity?: number;
}
