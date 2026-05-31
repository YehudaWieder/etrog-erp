import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { sanitizeText } from 'src/common/utils/input-normalization.util';

export function isManagerOrAbove(actor: AuthenticatedUser): boolean {
  return actor.role === Role.MANAGER || actor.role === Role.OWNER;
}

export function validatePaymentPercentInput(paymentPercent: number): void {
  if (!Number.isFinite(paymentPercent) || paymentPercent < 0 || paymentPercent > 100) {
    throw new BadRequestException('paymentPercent must be between 0 and 100');
  }
}

export function normalizeTraderName(name: string): string {
  return sanitizeText(name);
}

export function createTraderSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-');
}

export function decimalToNumber(value: number | { toString(): string }): number {
  return typeof value === 'number' ? value : parseFloat(value.toString());
}
