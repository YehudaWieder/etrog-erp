import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class PricingConfigDto {
  @ApiProperty({ description: 'Season ID to update pricing for.', example: 1 })
  seasonId!: number;

  @ApiProperty({ enum: Currency, enumName: 'Currency', description: 'Pricing currency.' })
  currency!: Currency;

  @ApiProperty({ description: 'Unit price value.' })
  unitPrice!: number;
}
