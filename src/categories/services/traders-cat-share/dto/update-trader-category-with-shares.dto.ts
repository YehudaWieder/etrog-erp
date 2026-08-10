import { Grade } from '@prisma/client';
import { GradeGroup } from 'src/categories/utils/trader-category-grade-groups.util';
import { TraderShareRowDto } from './trader-share-row.dto';

export interface UpdateTraderCategoryWithSharesDto {
  id: number;
  name?: string;
  notes?: string;
  supportedGrades?: Grade[];
  gradeGroups?: GradeGroup[];
  shares: TraderShareRowDto[];
}
