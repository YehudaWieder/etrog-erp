import { BadRequestException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLoginDto(dto: LoginDto): LoginDto {
  return {
    email: dto.email.trim().toLowerCase(),
    password: dto.password,
  };
}

export function validateLoginDto(dto: LoginDto): void {
  if (!dto.email || !dto.password) {
    throw new BadRequestException('email and password are required.');
  }

  if (!EMAIL_REGEX.test(dto.email)) {
    throw new BadRequestException('Invalid email format.');
  }
}
