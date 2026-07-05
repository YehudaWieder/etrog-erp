import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username.', example: 'warehouse_manager' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional unique phone number.', example: '0541112233' })
  phone?: string;
}
