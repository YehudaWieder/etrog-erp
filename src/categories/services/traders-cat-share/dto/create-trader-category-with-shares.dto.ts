import { Grade } from '@prisma/client';
import { TraderShareRowDto } from './trader-share-row.dto';

export interface CreateTraderCategoryWithSharesDto {
  seasonId: number;
  name: string;
  notes?: string;
  supportedGrades?: Grade[];
  shares: TraderShareRowDto[];
}
