import { Grade, PitamStatus } from '@prisma/client';

export class CustomerGeneralAllocationRequestDto {
  id!: number;
  date!: string;
  dateHebrew!: string;
  quantity!: number;
  pitamStatus!: PitamStatus;
  grade!: Grade;
  traderCategoryId!: number;
  customerId!: number;
  customerCategoryId!: number;
  notes?: string;
}
