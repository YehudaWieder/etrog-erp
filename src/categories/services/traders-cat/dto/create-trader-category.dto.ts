import { Grade } from '@prisma/client';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';

export interface CreateTraderCategoryDto {
  name: string;
  notes?: string;
  supportedGrades?: Grade[];
  gradeGroups?: GradeGroup<Grade>[];
}
