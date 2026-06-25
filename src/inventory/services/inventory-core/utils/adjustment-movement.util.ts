import { BadRequestException } from '@nestjs/common';
import { MovementType } from '@prisma/client';

export function validateAdjustmentType(type?: MovementType | null): void {
  if (!type) {
    throw new BadRequestException('type is required for adjustment movement');
  }

  if (
    type !== MovementType.WASTE &&
    type !== MovementType.ADJUSTMENT &&
    type !== MovementType.SELF_PICKUP
  ) {
    throw new BadRequestException('type must be WASTE, ADJUSTMENT, or SELF_PICKUP');
  }
}

export function requireAdjustmentQuantity(value?: number): number {
  if (value === undefined || value === null) {
    throw new BadRequestException('quantity is required for adjustment movement');
  }

  return Number(value);
}

export function normalizeAdjustmentQuantity(type: MovementType, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new BadRequestException('quantity must be a non-zero number');
  }

  if (type === MovementType.WASTE || type === MovementType.SELF_PICKUP) {
    return -Math.abs(quantity);
  }

  return quantity;
}
