import { BadRequestException } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';

export type SystemConfigPayload = {
  currency?: Currency;
  unitPrice?: number;
  smallBoxCapacity?: number;
  mediumBoxCapacity?: number;
  largeBoxCapacity?: number;
  customBoxCapacity?: number;
};

export function assertPositiveCapacity(value: unknown, field: string): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${field} must be a positive integer.`);
  }
}

export function validateCapacities(data?: SystemConfigPayload): void {
  assertPositiveCapacity(data?.smallBoxCapacity, 'smallBoxCapacity');
  assertPositiveCapacity(data?.mediumBoxCapacity, 'mediumBoxCapacity');
  assertPositiveCapacity(data?.largeBoxCapacity, 'largeBoxCapacity');
  assertPositiveCapacity(data?.customBoxCapacity, 'customBoxCapacity');
}

export function hasCompletePricingDefinition(data?: SystemConfigPayload): boolean {
  return data?.currency !== undefined && data?.unitPrice !== undefined;
}

export function buildSystemConfigWriteData(
  seasonId: number,
  data?: SystemConfigPayload,
): {
  updateData: Prisma.SystemConfigUpdateInput;
  createData: Prisma.SystemConfigUncheckedCreateInput;
} {
  const updateData: Prisma.SystemConfigUpdateInput = {};
  const createData: Prisma.SystemConfigUncheckedCreateInput = { seasonId };

  if (data?.currency !== undefined) {
    updateData.currency = data.currency;
    createData.currency = data.currency;
  }

  if (data?.unitPrice !== undefined) {
    updateData.unitPrice = data.unitPrice;
    createData.unitPrice = data.unitPrice;
  }

  if (data?.smallBoxCapacity !== undefined) {
    updateData.smallBoxCapacity = data.smallBoxCapacity;
    createData.smallBoxCapacity = data.smallBoxCapacity;
  }

  if (data?.mediumBoxCapacity !== undefined) {
    updateData.mediumBoxCapacity = data.mediumBoxCapacity;
    createData.mediumBoxCapacity = data.mediumBoxCapacity;
  }

  if (data?.largeBoxCapacity !== undefined) {
    updateData.largeBoxCapacity = data.largeBoxCapacity;
    createData.largeBoxCapacity = data.largeBoxCapacity;
  }

  return { updateData, createData };
}
