import { AssignmentType, Grade, PitamStatus } from 'src/generated/prisma';

export class UpdateClassificationDto {
  assignmentType?: AssignmentType;
  pitamStatus?: PitamStatus;
  quantity?: number;
  traderId?: number | null;
  customerId?: number | null;
  traderCategoryId?: number | null;
  customerCategoryId?: number | null;
  grade?: Grade | null;
  notes?: string | null;
}
