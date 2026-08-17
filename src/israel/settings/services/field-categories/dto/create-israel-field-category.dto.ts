import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class CreateIsraelFieldCategoryDto {
  @ApiProperty({ description: 'Season ID this category belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Israel field (seller) ID this category belongs to.', example: 1 })
  fieldId!: number;

  @ApiProperty({ description: 'Category name.', example: 'A Grade' })
  name!: string;

  @ApiProperty({ description: 'Price for this category.', example: 3.5 })
  price!: number;

  @ApiProperty({ description: 'Currency for the price.', enum: Currency, example: Currency.ILS })
  currency!: Currency;
}
