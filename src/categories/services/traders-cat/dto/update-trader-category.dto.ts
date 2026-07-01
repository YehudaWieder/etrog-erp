import { Grade } from '@prisma/client';

export interface UpdateTraderCategoryDto {
  id: number;
  name?: string;
  notes?: string;
  supportedGrades?: Grade[];
}
