import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TraderShareDetailDto {
  @ApiProperty({ description: 'Trader ID.' })
  traderId!: number;

  @ApiProperty({ description: 'Trader name.' })
  traderName!: string;

  @ApiProperty({
    description: 'Percentage share for this trader in the category.',
    example: 50,
  })
  percent!: number;
}

export class DefaultTraderCategoryApprovalResponseDto {
  @ApiProperty({ description: 'Default trader category ID.' })
  id!: number;

  @ApiProperty({ description: 'Default trader category name.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Category notes.' })
  notes?: string;

  @ApiProperty({
    type: [TraderShareDetailDto],
    description: 'All trader shares for this category.',
  })
  shares!: TraderShareDetailDto[];

  @ApiProperty({
    description: 'Total percentage allocation across all traders (should be <= 100%).',
    example: 100,
  })
  totalPercent!: number;

  @ApiProperty({ description: 'Category creation timestamp.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Category update timestamp.' })
  updatedAt!: Date;
}
