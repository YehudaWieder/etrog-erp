import { TraderShareRowDto } from './trader-share-row.dto';

export interface UpdateTraderCategoryWithSharesDto {
  id: number;
  name?: string;
  notes?: string;
  shares: TraderShareRowDto[];
}
