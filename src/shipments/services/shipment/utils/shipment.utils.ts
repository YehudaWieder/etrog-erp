import { BadRequestException } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';

export type CreateShipmentInput = {
  shipmentNumber: number;
  notes?: string;
};

export type UpdateShipmentInput = {
  shipmentNumber?: number;
  status?: ShipmentStatus;
  shippedAt?: Date | string;
  notes?: string | null;
};

export function resolveShippedAt(
  status: ShipmentStatus | undefined,
  shippedAt: Date | string | null | undefined,
): Date | null {
  if (status === ShipmentStatus.SHIPPED) {
    return shippedAt ? new Date(shippedAt) : new Date();
  }

  if (status === ShipmentStatus.DELIVERED) {
    return shippedAt ? new Date(shippedAt) : null;
  }

  return null;
}

export function assertPositiveInt(value: unknown, fieldName: string): void {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer`);
  }
}

export function assertValidDate(value: unknown, fieldName: string): void {
  if (value === undefined || value === null) {
    return;
  }

  const parsedDate = new Date(value as string | Date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
}

export function assertOnlyAllowedFields(
  data: Record<string, unknown>,
  allowedFields: string[],
  blockedMessage: string,
): void {
  const invalidKeys = Object.keys(data).filter((key) => !allowedFields.includes(key));
  if (invalidKeys.length > 0) {
    throw new BadRequestException(blockedMessage);
  }
}

export function validateCreateShipmentInput(data: CreateShipmentInput): void {
  assertOnlyAllowedFields(
    data as Record<string, unknown>,
    ['shipmentNumber', 'notes'],
    'Only shipmentNumber and notes are allowed. seasonId, totals, slug, isDeleted, and updatedById are managed by the server',
  );

  assertPositiveInt(data.shipmentNumber, 'shipmentNumber');

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }
}

export function validateUpdateShipmentInput(data: UpdateShipmentInput): void {
  if (Object.keys(data).length === 0) {
    throw new BadRequestException('At least one shipment field must be provided for update');
  }

  assertOnlyAllowedFields(
    data as Record<string, unknown>,
    ['shipmentNumber', 'status', 'shippedAt', 'notes'],
    'Only shipmentNumber, status, shippedAt, and notes can be updated here. updatedById is managed by the server',
  );

  if (data.shipmentNumber !== undefined) {
    assertPositiveInt(data.shipmentNumber, 'shipmentNumber');
  }

  if (data.status !== undefined && !Object.values(ShipmentStatus).includes(data.status as ShipmentStatus)) {
    throw new BadRequestException('status is invalid');
  }

  assertValidDate(data.shippedAt, 'shippedAt');

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    throw new BadRequestException('notes must be a string');
  }
}
