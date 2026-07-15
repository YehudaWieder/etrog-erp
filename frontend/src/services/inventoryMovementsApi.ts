import { apiClient } from './apiClient';

export type Grade = string;
export type PitamStatus = 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';

export type TraderAdjustmentMovementType = 'WASTE' | 'SELF_PICKUP' | 'ADJUSTMENT';

export type CreateTraderAdjustmentPayload = {
  date: string;
  dateHebrew?: string | null;
  traderId?: number | null;
  traderCategoryId: number;
  grade: Grade;
  pitamStatus: PitamStatus;
  quantity: number;
  isModulo?: boolean;
  type: TraderAdjustmentMovementType;
  stockSource?: 'GENERAL' | 'PRIVATE_SELECTION';
  notes?: string | null;
};

export async function createTraderAdjustmentMovement(payload: CreateTraderAdjustmentPayload) {
  return apiClient('/trader-stock/adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export enum InventoryOwnerType {
  TRADER = 'TRADER',
  CUSTOMER = 'CUSTOMER',
  MODULO = 'MODULO',
}

export type InternalTransferMovementType = 'OWNERSHIP_TRANSFER' | 'INTERNAL_TRANSFER' | 'ASSIGNED' | 'PRIVATE_SELECTION';

export type CreateInternalTransferPayload = {
  type: InternalTransferMovementType;
  date: string;
  dateHebrew?: string | null;
  quantity: number;
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
  toPitamStatus?: PitamStatus;
  toCustomerCategoryId?: number;
  fromOwnerType: InventoryOwnerType;
  fromTraderId?: number;
  fromCustomerId?: number;
  toOwnerType: InventoryOwnerType;
  toTraderId?: number;
  toCustomerId?: number;
  stockSource?: 'GENERAL' | 'PRIVATE_SELECTION';
  notes?: string | null;
};

export async function createInternalTransfer(payload: CreateInternalTransferPayload) {
  return apiClient('/inventory/internal-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type CreateCustomerGeneralTransferPayload = {
  date: string;
  dateHebrew: string;
  quantity: number;
  pitamStatus: PitamStatus;
  grade: Grade;
  traderCategoryId: number;
  customerId: number;
  customerCategoryId: number;
  notes?: string | null;
};

export async function createCustomerGeneralTransfer(payload: CreateCustomerGeneralTransferPayload) {
  return apiClient('/inventory/customer-general-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type CustomerAdjustmentMovementType = 'WASTE' | 'SELF_PICKUP' | 'ADJUSTMENT';

export type CreateCustomerAdjustmentPayload = {
  date: string;
  dateHebrew?: string;
  customerId: number;
  customerCategoryId: number;
  pitamStatus: PitamStatus;
  quantity: number;
  type: CustomerAdjustmentMovementType;
  takenFrom?: 'GENERAL' | 'TRADER';
  notes?: string | null;
};

export async function createCustomerAdjustmentMovement(payload: CreateCustomerAdjustmentPayload) {
  return apiClient('/customer-allocations/adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
