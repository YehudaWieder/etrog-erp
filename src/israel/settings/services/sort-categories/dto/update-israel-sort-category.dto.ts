import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';

export class UpdateIsraelSortCategoryDto {
  @ApiProperty({ description: 'Israel sorting category ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique sorting category name.', example: 'Mehudar' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;

  @ApiPropertyOptional({
    enum: Grade,
    isArray: true,
    description: 'Grades this category supports.',
  })
  supportedGrades?: Grade[];

  @ApiPropertyOptional({
    description: 'Optional named sub-groupings of the supported grades.',
  })
  gradeGroups?: GradeGroup[];
}
