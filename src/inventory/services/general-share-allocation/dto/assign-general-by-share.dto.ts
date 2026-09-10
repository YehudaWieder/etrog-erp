import { Grade, PitamStatus } from '@prisma/client';

export class AssignGeneralByShareDto {
  date!: string;
  traderCategoryId!: number;
  grade!: Grade;
  pitamStatus!: PitamStatus;
  quantity!: number;
  notes?: string;
}
