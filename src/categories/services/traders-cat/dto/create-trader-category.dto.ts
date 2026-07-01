import { Grade } from '@prisma/client';

export interface CreateTraderCategoryDto {
  name: string;
  notes?: string;
  supportedGrades?: Grade[];
}
