import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';

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

  @ApiPropertyOptional({
    description: 'Groups of grades used to display percentage splits. Each grade may belong to at most one group.',
    example: [{ name: 'Premium', grades: ['א', 'ב'] }],
  })
  gradeGroups?: GradeGroup[];
}
