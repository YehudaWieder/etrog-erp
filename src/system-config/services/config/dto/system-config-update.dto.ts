import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class SystemConfigUpdateDto {
  @ApiProperty({ description: 'Season ID to update configuration for.', example: 1 })
  seasonId!: number;

  @ApiPropertyOptional({
    enum: Currency,
    enumName: 'Currency',
    description: 'Updated pricing currency.',
    example: 'USD',
  })
  currency?: Currency;

  @ApiPropertyOptional({ description: 'Updated unit price value.', example: 10.25 })
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Updated default capacity for SMALL boxes.', example: 20 })
  smallBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Updated default capacity for MEDIUM boxes.', example: 30 })
  mediumBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Updated default capacity for LARGE boxes.', example: 40 })
  largeBoxCapacity?: number;

  @ApiPropertyOptional({ description: 'Updated default capacity for CUSTOM boxes.', example: 30 })
  customBoxCapacity?: number;
}
