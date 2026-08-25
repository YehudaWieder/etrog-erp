import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';

export class UpdateIsraelSortCategoryDto {
  @ApiProperty({ description: 'Israel sorting category ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique sorting category name.', example: 'Mehudar' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Grades this category supports (built-in or custom free-text grades).',
  })
  supportedGrades?: string[];

  @ApiPropertyOptional({
    description: 'Optional named sub-groupings of the supported grades.',
  })
  gradeGroups?: GradeGroup[];
}
