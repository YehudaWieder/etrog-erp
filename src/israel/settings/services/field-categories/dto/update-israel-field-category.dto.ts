import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class UpdateIsraelFieldCategoryDto {
  @ApiProperty({ description: 'Israel field category ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New category name.', example: 'A Grade' })
  name!: string;

  @ApiProperty({ description: 'New price for this category.', example: 3.5 })
  price!: number;

  @ApiProperty({ description: 'New currency for the price.', enum: Currency, example: Currency.ILS })
  currency!: Currency;
}
