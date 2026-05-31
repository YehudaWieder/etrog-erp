import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username.', example: 'warehouse_manager' })
  name!: string;

  @ApiProperty({ description: 'Unique email address.', example: 'manager@etrog-erp.com' })
  email!: string;

  @ApiPropertyOptional({ description: 'Optional unique phone number.', example: '0541112233' })
  phone?: string;

  @ApiProperty({ description: 'Account password.', example: 'StrongPass123!' })
  password!: string;
}
