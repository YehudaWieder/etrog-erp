import { BadRequestException } from '@nestjs/common';
import { BoxOwnership, BoxStatus, BoxType } from '@prisma/client';

export type CreateBoxInput = {
  shipmentId: number;
  boxNumber: number;
  boxType?: BoxType;
  status?: BoxStatus;
  notes?: string;
  ownershipType?: BoxOwnership;
  traderId?: number;
  customerId?: number;
  externalOwnerName?: string;
};

export type BulkCreateBoxInput = {
  shipmentId: number;
  startNumber: number;
  endNumber: number;
};

export const MAX_BULK_BOX_RANGE = 100;

export type UpdateBoxInput = {
  shipmentId?: number;
  boxNumber?: number;
  boxType?: BoxType;
  status?: BoxStatus;
  notes?: string | null;
  ownershipType?: BoxOwnership;
  traderId?: number | null;
  customerId?: number | null;
  externalOwnerName?: string | null;
};

export function assertPositiveInt(value: unknown, fieldName: string): void {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer`);
  }
}

export function assertOnlyAllowedFields(
  data: Record<string, unknown>,
  allowedFields: string[],
  message: string,
): void {
  const invalid = Object.keys(data).filter((k) => !allowedFields.includes(k));
  if (invalid.length > 0) {
    throw new BadRequestException(message);
  }
}

export function validateBoxOwnership(
  ownershipType: unknown,
  traderId: unknown,
  customerId: unknown,
  externalOwnerName?: unknown,
): void {
  if (ownershipType !== undefined && !Object.values(BoxOwnership).includes(ownershipType as BoxOwnership)) {
    throw new BadRequestException('ownershipType is invalid');
  }

  if (traderId !== undefined && traderId !== null) {
    assertPositiveInt(traderId, 'traderId');
  }

  if (customerId !== undefined && customerId !== null) {
    assertPositiveInt(customerId, 'customerId');
  }

  if (ownershipType === BoxOwnership.TRADER && (traderId === undefined || traderId === null)) {
    throw new BadRequestException('traderId is required when ownershipType=TRADER');
  }

  if (ownershipType === BoxOwnership.CUSTOMER && (customerId === undefined || customerId === null)) {
    throw new BadRequestException('customerId is required when ownershipType=CUSTOMER');
  }

  if (ownershipType !== BoxOwnership.TRADER && ownershipType !== BoxOwnership.CUSTOM && traderId !== undefined && traderId !== null) {
    throw new BadRequestException('traderId must be empty unless ownershipType=TRADER or ownershipType=CUSTOM');
  }

  if (ownershipType !== BoxOwnership.CUSTOMER && ownershipType !== BoxOwnership.CUSTOM && customerId !== undefined && customerId !== null) {
    throw new BadRequestException('customerId must be empty unless ownershipType=CUSTOMER or ownershipType=CUSTOM');
  }

  if (
    ownershipType === BoxOwnership.EXTERNAL_TRADER &&
    (typeof externalOwnerName !== 'string' || externalOwnerName.trim().length === 0)
  ) {
    throw new BadRequestException('externalOwnerName is required when ownershipType=EXTERNAL_TRADER');
  }

  if (
    ownershipType !== BoxOwnership.EXTERNAL_TRADER &&
    externalOwnerName !== undefined &&
    externalOwnerName !== null
  ) {
    throw new BadRequestException('externalOwnerName must be empty unless ownershipType=EXTERNAL_TRADER');
  }
}

export function validateCreateBoxInput(data: CreateBoxInput): void {
  assertOnlyAllowedFields(
    data as Record<string, unknown>,
    ['shipmentId', 'boxNumber', 'boxType', 'status', 'notes', 'ownershipType', 'traderId', 'customerId', 'externalOwnerName'],
    'Only shipmentId, boxNumber, boxType, status, notes, ownershipType, traderId, customerId, externalOwnerName are allowed on create. seasonId, totalQuantity, and updatedById are managed by the server',
  );

  assertPositiveInt(data.shipmentId, 'shipmentId');
  assertPositiveInt(data.boxNumber, 'boxNumber');

  // boxType is irrelevant for EXTERNAL_TRADER boxes (they never hold items, so capacity doesn't
  // apply) — the server defaults it instead of requiring the caller to pick one.
  if (data.boxType !== undefined || data.ownershipType !== BoxOwnership.EXTERNAL_TRADER) {
    if (!Object.values(BoxType).includes(data.boxType as BoxType)) {
      throw new BadRequestException('boxType is invalid');
    }
  }

  if (data.status !== undefined && !Object.values(BoxStatus).includes(data.status as BoxStatus)) {
    throw new BadRequestException('status is invalid');
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }

  validateBoxOwnership(data.ownershipType, data.traderId, data.customerId, data.externalOwnerName);
}

export function validateBulkCreateBoxInput(data: BulkCreateBoxInput): void {
  assertOnlyAllowedFields(
    data as Record<string, unknown>,
    ['shipmentId', 'startNumber', 'endNumber'],
    'Only shipmentId, startNumber, endNumber are allowed when bulk-creating boxes.',
  );

  assertPositiveInt(data.shipmentId, 'shipmentId');
  assertPositiveInt(data.startNumber, 'startNumber');
  assertPositiveInt(data.endNumber, 'endNumber');

  if (data.endNumber < data.startNumber) {
    throw new BadRequestException('endNumber must be greater than or equal to startNumber');
  }

  const rangeSize = data.endNumber - data.startNumber + 1;
  if (rangeSize > MAX_BULK_BOX_RANGE) {
    throw new BadRequestException(`Cannot create more than ${MAX_BULK_BOX_RANGE} boxes at once`);
  }
}

export function validateBulkDeleteBoxInput(ids: unknown): asserts ids is number[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestException('ids must be a non-empty array of box IDs');
  }

  if (ids.length > MAX_BULK_BOX_RANGE) {
    throw new BadRequestException(`Cannot delete more than ${MAX_BULK_BOX_RANGE} boxes at once`);
  }

  ids.forEach((id) => assertPositiveInt(id, 'id'));
}

export function validateUpdateBoxInput(data: UpdateBoxInput): void {
  if (Object.keys(data).length === 0) {
    throw new BadRequestException('At least one box field must be provided for update');
  }

  assertOnlyAllowedFields(
    data as Record<string, unknown>,
    ['shipmentId', 'boxNumber', 'boxType', 'status', 'notes', 'ownershipType', 'traderId', 'customerId', 'externalOwnerName'],
    'Only shipmentId, boxNumber, boxType, status, notes, ownershipType, traderId, customerId, externalOwnerName can be updated here.',
  );

  if (data.shipmentId !== undefined) {
    assertPositiveInt(data.shipmentId, 'shipmentId');
  }

  if (data.boxNumber !== undefined) {
    assertPositiveInt(data.boxNumber, 'boxNumber');
  }

  if (data.boxType !== undefined && !Object.values(BoxType).includes(data.boxType as BoxType)) {
    throw new BadRequestException('boxType is invalid');
  }

  if (data.status !== undefined && !Object.values(BoxStatus).includes(data.status as BoxStatus)) {
    throw new BadRequestException('status is invalid');
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }

  validateBoxOwnership(data.ownershipType, data.traderId, data.customerId, data.externalOwnerName);
}
