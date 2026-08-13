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

export type CreateCustomerToGeneralTransferPayload = {
  date?: string;
  customerId: number;
  customerCategoryId: number;
  pitamStatus: PitamStatus;
  toPitamStatus?: PitamStatus;
  grade: Grade;
  traderCategoryId: number;
  quantity: number;
  toRemainsInItaly?: boolean;
  notes?: string | null;
};

export async function createCustomerToGeneralTransfer(payload: CreateCustomerToGeneralTransferPayload) {
  return apiClient('/inventory/customer-to-general-transfer', {
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

export type RemainsInItalyDestinationType = 'TRADER' | 'CUSTOMER' | 'GENERAL';

export type CreateRemainsInItalyWithdrawalPayload = {
  date?: string;
  quantity: number;
  traderCategoryId: number;
  grade: Grade;
  pitamStatus: PitamStatus;
  destinationType: RemainsInItalyDestinationType;
  traderId?: number;
  customerId?: number;
  customerCategoryId?: number;
  notes?: string | null;
};

export async function createRemainsInItalyWithdrawal(payload: CreateRemainsInItalyWithdrawalPayload) {
  return apiClient('/inventory/remains-in-italy-withdrawal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type RemainsInItalyWithdrawalBatch = {
  id: number;
  seasonId: number;
  date: string;
  traderCategoryId: number;
  grade: Grade;
  pitamStatus: PitamStatus;
  quantity: number;
  destinationType: RemainsInItalyDestinationType;
  traderId: number | null;
  traderName: string | null;
  customerId: number | null;
  customerCategoryId: number | null;
  customerName: string | null;
  availableQuantity: number;
  notes: string | null;
};

export type FetchRemainsInItalyWithdrawalBatchesParams = {
  seasonId?: number;
  traderCategoryId?: number;
  grade?: Grade;
  pitamStatus?: PitamStatus;
};

export async function fetchRemainsInItalyWithdrawalBatches(
  params: FetchRemainsInItalyWithdrawalBatchesParams = {},
): Promise<RemainsInItalyWithdrawalBatch[]> {
  const query = new URLSearchParams();
  if (params.seasonId) query.set('seasonId', String(params.seasonId));
  if (params.traderCategoryId) query.set('traderCategoryId', String(params.traderCategoryId));
  if (params.grade) query.set('grade', params.grade);
  if (params.pitamStatus) query.set('pitamStatus', params.pitamStatus);

  const queryString = query.toString();
  return apiClient<RemainsInItalyWithdrawalBatch[]>(
    `/inventory/remains-in-italy-withdrawal${queryString ? `?${queryString}` : ''}`,
    { suppressGlobalFeedback: true },
  );
}

export async function undoRemainsInItalyWithdrawal(id: number, quantity?: number) {
  const query = quantity !== undefined ? `?quantity=${quantity}` : '';
  return apiClient(`/inventory/remains-in-italy-withdrawal/${id}${query}`, {
    method: 'DELETE',
  });
}

export async function updateRemainsInItalyWithdrawal(id: number, payload: CreateRemainsInItalyWithdrawalPayload) {
  return apiClient(`/inventory/remains-in-italy-withdrawal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export type PitamSplitSource = 'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL';

// Trader-only: a customer always has a definite pitam status, so there is nothing to resolve there.
export type CreatePitamSplitPayload = {
  source: PitamSplitSource;
  traderId?: number;
  traderCategoryId: number;
  grade: Grade;
  withQty: number;
  withoutQty: number;
  date?: string;
  notes?: string | null;
};

export async function createPitamSplitMovement(payload: CreatePitamSplitPayload) {
  return apiClient('/inventory/pitam-split', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type PitamSplitBatchSource = 'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL';

export type PitamSplitBatch = {
  batchId: string;
  seasonId: number;
  date: string;
  traderCategoryId: number;
  grade: Grade;
  source: PitamSplitBatchSource;
  traderId: number | null;
  traderName: string | null;
  affectedCount: number;
  withQty: number;
  withoutQty: number;
  availableQuantity: number;
  notes: string | null;
};

export type FetchPitamSplitBatchesParams = {
  seasonId?: number;
  traderCategoryId?: number;
  grade?: Grade;
};

export async function fetchPitamSplitBatches(params: FetchPitamSplitBatchesParams = {}): Promise<PitamSplitBatch[]> {
  const query = new URLSearchParams();
  if (params.seasonId) query.set('seasonId', String(params.seasonId));
  if (params.traderCategoryId) query.set('traderCategoryId', String(params.traderCategoryId));
  if (params.grade) query.set('grade', params.grade);

  const queryString = query.toString();
  return apiClient<PitamSplitBatch[]>(`/inventory/pitam-split${queryString ? `?${queryString}` : ''}`, {
    suppressGlobalFeedback: true,
  });
}

export async function undoPitamSplitBatch(batchId: string, quantity?: number) {
  const query = quantity !== undefined ? `?quantity=${quantity}` : '';
  return apiClient(`/inventory/pitam-split/${batchId}${query}`, {
    method: 'DELETE',
  });
}

export async function updatePitamSplitBatch(batchId: string, payload: CreatePitamSplitPayload) {
  return apiClient(`/inventory/pitam-split/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export type ReclassificationSource = 'SPECIFIC_TRADER' | 'GENERAL' | 'REMAINS_IN_ITALY';

export type CreateReclassificationPayload = {
  source: ReclassificationSource;
  traderId?: number;
  fromTraderCategoryId: number;
  fromGrade: Grade;
  fromPitamStatus: PitamStatus;
  toTraderCategoryId: number;
  toGrade: Grade;
  toPitamStatus: PitamStatus;
  quantity: number;
  toRemainsInItaly?: boolean;
  date?: string;
  notes?: string | null;
};

export async function createReclassificationMovement(payload: CreateReclassificationPayload) {
  return apiClient('/inventory/reclassification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type ReclassificationTuple = {
  traderCategoryId: number;
  grade: Grade;
  pitamStatus: PitamStatus;
};

export type ReclassificationBatch = {
  id: number;
  seasonId: number;
  date: string;
  source: ReclassificationSource;
  traderId: number | null;
  traderName: string | null;
  from: ReclassificationTuple;
  to: ReclassificationTuple | null;
  quantity: number;
  availableQuantity: number;
  notes: string | null;
};

export type FetchReclassificationBatchesParams = {
  seasonId?: number;
  traderCategoryId?: number;
  grade?: Grade;
  pitamStatus?: PitamStatus;
};

export async function fetchReclassificationBatches(
  params: FetchReclassificationBatchesParams = {},
): Promise<ReclassificationBatch[]> {
  const query = new URLSearchParams();
  if (params.seasonId) query.set('seasonId', String(params.seasonId));
  if (params.traderCategoryId) query.set('traderCategoryId', String(params.traderCategoryId));
  if (params.grade) query.set('grade', params.grade);
  if (params.pitamStatus) query.set('pitamStatus', params.pitamStatus);

  const queryString = query.toString();
  return apiClient<ReclassificationBatch[]>(`/inventory/reclassification${queryString ? `?${queryString}` : ''}`, {
    suppressGlobalFeedback: true,
  });
}

export async function undoReclassificationBatch(id: number, quantity?: number) {
  const query = quantity !== undefined ? `?quantity=${quantity}` : '';
  return apiClient(`/inventory/reclassification/${id}${query}`, {
    method: 'DELETE',
  });
}

export async function updateReclassificationBatch(id: number, payload: CreateReclassificationPayload) {
  return apiClient(`/inventory/reclassification/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export type ReclassificationSummaryEntry = {
  from: ReclassificationTuple;
  to: ReclassificationTuple;
  quantity: number;
};

export async function fetchReclassificationSummary(seasonId?: number): Promise<ReclassificationSummaryEntry[]> {
  const query = new URLSearchParams();
  if (seasonId) query.set('seasonId', String(seasonId));

  const queryString = query.toString();
  return apiClient<ReclassificationSummaryEntry[]>(
    `/inventory/reclassification/summary${queryString ? `?${queryString}` : ''}`,
    { suppressGlobalFeedback: true },
  );
}
