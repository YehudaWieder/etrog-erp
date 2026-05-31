import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class SystemConfigCreateDto {
  @ApiProperty({ description: 'Season ID for which the configuration is created or retrieved.', example: 1 })
  seasonId!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    description: 'Initial currency value (required for new configuration).',
    example: 'ILS',
  })
  currency!: Currency;

  @ApiProperty({ description: 'Initial unit price value (required for new configuration).', example: 8.5 })
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Default capacity for SMALL boxes.', example: 20 })
  smallBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Default capacity for MEDIUM boxes.', example: 30 })
  mediumBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Default capacity for LARGE boxes.', example: 40 })
  largeBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Default capacity for CUSTOM boxes.', example: 30 })
  customBoxCapacity?: number;
}
