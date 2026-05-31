import { Role } from '@prisma/client';

export interface LoginUserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface LoginResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: LoginUserDto;
}
