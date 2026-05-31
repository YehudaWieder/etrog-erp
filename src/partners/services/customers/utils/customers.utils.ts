import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  isValidEmail,
  isValidPhone,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
} from 'src/common/utils/input-normalization.util';

export type CustomerWriteInput = {
  customerName?: string;
  email?: string | null;
  phone?: string | null;
};

export function isManagerOrAbove(actor: AuthenticatedUser): boolean {
  return actor.role === Role.MANAGER || actor.role === Role.OWNER;
}

export function sanitizeCustomerWriteInput(data: CustomerWriteInput): CustomerWriteInput {
  const sanitized: CustomerWriteInput = { ...data };

  if (typeof sanitized.customerName === 'string') {
    sanitized.customerName = sanitizeText(sanitized.customerName);
  }

  if (typeof sanitized.email === 'string') {
    const normalizedEmail = sanitizeEmail(sanitized.email);
    sanitized.email = normalizedEmail === '' ? null : normalizedEmail;
  }

  if (typeof sanitized.phone === 'string') {
    const normalizedPhone = sanitizePhone(sanitized.phone);
    sanitized.phone = normalizedPhone === '' ? null : normalizedPhone;
  }

  return sanitized;
}

export function validateCustomerWriteInput(data: CustomerWriteInput): void {
  if (typeof data.customerName === 'string' && data.customerName === '') {
    throw new BadRequestException('customerName cannot be empty');
  }

  if (typeof data.email === 'string' && !isValidEmail(data.email)) {
    throw new BadRequestException('email is not valid');
  }

  if (typeof data.phone === 'string' && !isValidPhone(data.phone)) {
    throw new BadRequestException('phone is not valid');
  }
}

export function createCustomerSlug(customerName: string): string {
  return customerName.toLowerCase().replace(/ /g, '-');
}
