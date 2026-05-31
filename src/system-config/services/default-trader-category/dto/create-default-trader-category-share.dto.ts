import { ApiProperty } from '@nestjs/swagger';

export class CreateDefaultTraderCategoryShareDto {
  @ApiProperty({ description: 'Default trader category ID', example: 1 })
  defaultTraderCategoryId!: number;

  @ApiProperty({ description: 'Trader ID to associate with this category share.', example: 1 })
  traderId!: number;

  @ApiProperty({
    description: 'Percentage share for this trader in the category (0-100).',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  percent!: number;
}
