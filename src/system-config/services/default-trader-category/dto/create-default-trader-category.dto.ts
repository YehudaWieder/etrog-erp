import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';

export class CreateDefaultTraderCategoryDto {
  @ApiProperty({ description: 'Default trader category name.', example: 'Yanover' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional notes for the category.', example: 'Premium quality etrog' })
  notes?: string;

  @ApiPropertyOptional({
    enum: Grade,
    enumName: 'Grade',
    isArray: true,
    description: 'Grades supported by this category.',
  })
  supportedGrades?: Grade[];
}
