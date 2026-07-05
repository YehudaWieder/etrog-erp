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
  supabaseId: string;
  name: string;
  email: string;
  phone?: string;
  role?: never;
  isActive?: never;
};

export type SelfUpdateInput = {
  name?: string;
  phone?: string | null;
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

export function sanitizeCreateUserInput(data: CreateUserInput): {
  supabaseId: string;
  name: string;
  email: string;
  phone?: string;
} {
  const sanitizedName = sanitizeText(data.name);
  const sanitizedEmail = sanitizeEmail(data.email);
  const sanitizedPhoneRaw = data.phone !== undefined ? sanitizePhone(data.phone) : undefined;
  const sanitizedPhone = sanitizedPhoneRaw && sanitizedPhoneRaw.length > 0 ? sanitizedPhoneRaw : undefined;

  if (!sanitizedName) {
    throw new BadRequestException('name is required');
  }

  return {
    supabaseId: data.supabaseId,
    name: sanitizedName,
    email: sanitizedEmail,
    phone: sanitizedPhone,
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

  if (sanitized.phone !== undefined && sanitized.phone !== null) {
    const normalizedPhone = sanitizePhone(sanitized.phone);
    sanitized.phone = normalizedPhone.length === 0 ? null : normalizedPhone;
  }

  return sanitized;
}
