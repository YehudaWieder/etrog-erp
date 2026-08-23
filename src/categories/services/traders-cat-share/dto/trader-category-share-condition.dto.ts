import { TraderShareRowDto } from './trader-share-row.dto';

export type ShareConditionEndModeDto = 'EITHER' | 'BOTH';
export type ShareConditionStatusDto = 'ACTIVE' | 'DISABLED';

// Sent as part of the category "with-shares" create/update payload. The popup that edits this
// only stages it into the category form's local state — it's persisted only when the whole
// category form is saved, in the same transaction as the default shares.
export interface TraderCategoryShareConditionDto {
  id?: number; // present when editing an existing condition
  name: string;
  startDate: string;
  endDate?: string;
  endQuantityThreshold?: number;
  endConditionMode: ShareConditionEndModeDto;
  status: ShareConditionStatusDto;
  action?: 'DELETE'; // set to remove an existing condition instead of upserting it
  shares: TraderShareRowDto[];
}
