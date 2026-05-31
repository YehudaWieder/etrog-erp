import { ApiProperty } from '@nestjs/swagger';

export class UpdateDefaultTraderCategoryShareDto {
  @ApiProperty({ description: 'Default trader category ID', example: 1 })
  defaultTraderCategoryId!: number;

  @ApiProperty({ description: 'Trader ID whose share is being updated', example: 1 })
  traderId!: number;

  @ApiProperty({
    description: 'Updated percentage share for this trader in the category (0-100).',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  percent!: number;
}
