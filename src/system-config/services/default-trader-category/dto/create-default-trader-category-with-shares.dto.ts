import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';

export class CreateDefaultTraderCategoryWithSharesItemDto {
  @ApiProperty({ description: 'Trader ID to include in the default category distribution.', example: 1 })
  traderId!: number;

  @ApiProperty({
    description: 'Percentage share for this trader in the default category (0-100).',
    example: 35,
    minimum: 0,
    maximum: 100,
  })
  percent!: number;
}

export class CreateDefaultTraderCategoryWithSharesDto {
  @ApiProperty({ description: 'Default trader category name.', example: 'Yanover Premium' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional notes for the category.', example: 'Default multi-season setup' })
  notes?: string;

  @ApiPropertyOptional({
    enum: Grade,
    enumName: 'Grade',
    isArray: true,
    description: 'Grades supported by this category.',
  })
  supportedGrades?: Grade[];

  @ApiProperty({
    type: [CreateDefaultTraderCategoryWithSharesItemDto],
    description: 'Trader distribution rows for this category. Sum must equal 100%.',
    minItems: 1,
  })
  shares!: CreateDefaultTraderCategoryWithSharesItemDto[];
}
