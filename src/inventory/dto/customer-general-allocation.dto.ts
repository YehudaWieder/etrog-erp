import { Grade, PitamStatus } from 'src/generated/prisma';

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
