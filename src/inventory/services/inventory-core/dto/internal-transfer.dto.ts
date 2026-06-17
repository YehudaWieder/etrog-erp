import { Grade, MovementType, PitamStatus } from 'src/generated/prisma';

export enum InventoryOwnerType {
  TRADER = 'TRADER',
  CUSTOMER = 'CUSTOMER',
  MODULO = 'MODULO',
}

export class InternalTransferRequestDto {
  id!: number;
  type!: MovementType;
  date!: string;
  dateHebrew?: string;
  quantity!: number;
  pitamStatus?: PitamStatus;
  grade?: Grade;
  traderCategoryId?: number;
  customerCategoryId?: number;
  fromPitamStatus?: PitamStatus;
  fromTraderCategoryId?: number;
  fromGrade?: Grade;
  fromCustomerCategoryId?: number;
  toTraderCategoryId?: number;
  toGrade?: Grade;
  toCustomerCategoryId?: number;
  fromOwnerType!: InventoryOwnerType;
  fromTraderId?: number;
  fromCustomerId?: number;
  toOwnerType!: InventoryOwnerType;
  toTraderId?: number;
  toCustomerId?: number;
  notes?: string;
  stockSource?: 'GENERAL' | 'PRIVATE_SELECTION';
}
