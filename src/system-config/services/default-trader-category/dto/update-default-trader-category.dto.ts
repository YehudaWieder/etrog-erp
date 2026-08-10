import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';

export class UpdateDefaultTraderCategoryDto {
  @ApiProperty({ description: 'Default trader category ID.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated category name.', example: 'Yanover Premium' })
  name?: string;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Updated notes' })
  notes?: string;

  @ApiPropertyOptional({
    enum: Grade,
    enumName: 'Grade',
    isArray: true,
    description: 'Updated list of grades supported by this category.',
  })
  supportedGrades?: Grade[];

  @ApiPropertyOptional({
    description: 'Updated groups of grades used to display percentage splits. Each grade may belong to at most one group.',
    example: [{ name: 'Premium', grades: ['א', 'ב'] }],
  })
  gradeGroups?: GradeGroup[];
}
