import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  isValidEmail,
  isValidPhone,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
} from 'src/common/utils/input-normalization.util';

export type CreateUserInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: never;
  isActive?: never;
};

export type SelfUpdateInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

export type AdminUpdateInput = {
  role?: Role;
  isActive?: boolean;
};

export type UpdateUserByActorInput = SelfUpdateInput & AdminUpdateInput;

export function parseUserIdOrSlug(idOrSlug: string): number | string {
  const parsedId = Number.parseInt(idOrSlug, 10);
  return Number.isNaN(parsedId) ? idOrSlug : parsedId;
}

export function createUserSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-');
}

export function isPrivilegedRole(role: Role): boolean {
  return role === Role.OWNER || role === Role.MANAGER;
}

export function assertEmailFormat(email: string): void {
  if (!isValidEmail(email)) {
    throw new BadRequestException('Invalid email format.');
  }
}

export function assertPhoneFormat(phone: string): void {
  if (!isValidPhone(phone)) {
    throw new BadRequestException('Invalid phone format.');
  }
}

export function assertPasswordFormat(password: string, passwordRegex: RegExp): void {
  if (!passwordRegex.test(password)) {
    throw new BadRequestException(
      'Password must be at least 8 characters long and include letters and numbers.',
    );
  }
}

export function sanitizeCreateUserInput(data: CreateUserInput): {
  name: string;
  email: string;
  phone?: string;
  password: string;
} {
  const sanitizedName = sanitizeText(data.name);
  const sanitizedEmail = sanitizeEmail(data.email);
  const sanitizedPhoneRaw = data.phone !== undefined ? sanitizePhone(data.phone) : undefined;
  const sanitizedPhone = sanitizedPhoneRaw && sanitizedPhoneRaw.length > 0 ? sanitizedPhoneRaw : undefined;

  if (!sanitizedName) {
    throw new BadRequestException('name is required');
  }

  return {
    name: sanitizedName,
    email: sanitizedEmail,
    phone: sanitizedPhone,
    password: data.password,
  };
}

export function sanitizeSelfProfileFields(profileFields: SelfUpdateInput): SelfUpdateInput {
  const sanitized: SelfUpdateInput = { ...profileFields };

  if (sanitized.name !== undefined) {
    sanitized.name = sanitizeText(sanitized.name);
    if (sanitized.name.length === 0) {
      throw new BadRequestException('name cannot be empty');
    }
  }

  if (sanitized.email !== undefined) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }

  if (sanitized.phone !== undefined && sanitized.phone !== null) {
    const normalizedPhone = sanitizePhone(sanitized.phone);
    sanitized.phone = normalizedPhone.length === 0 ? null : normalizedPhone;
  }

  return sanitized;
}
