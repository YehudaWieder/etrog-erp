import { Grade } from '@prisma/client';
import { TraderShareRowDto } from './trader-share-row.dto';

export interface UpdateTraderCategoryWithSharesDto {
  id: number;
  name?: string;
  notes?: string;
  supportedGrades?: Grade[];
  shares: TraderShareRowDto[];
}
