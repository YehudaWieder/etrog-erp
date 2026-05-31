import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ description: 'User ID to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated unique username.', example: 'warehouse_manager' })
  name?: string;

  @ApiPropertyOptional({ description: 'Updated unique email address.', example: 'manager@etrog-erp.com' })
  email?: string;

  @ApiPropertyOptional({ description: 'Updated unique phone number.', example: '0541112233' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Current password, required when changing password.', example: 'OldPassword123!' })
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'New password.', example: 'NewPassword123!' })
  newPassword?: string;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', description: 'Updated user role.' })
  role?: Role;

  @ApiPropertyOptional({ description: 'Updated active status.' })
  isActive?: boolean;
}
