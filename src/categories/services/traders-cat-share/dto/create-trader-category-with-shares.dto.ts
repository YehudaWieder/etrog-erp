import { TraderShareRowDto } from './trader-share-row.dto';

export interface CreateTraderCategoryWithSharesDto {
  seasonId: number;
  name: string;
  notes?: string;
  shares: TraderShareRowDto[];
}
