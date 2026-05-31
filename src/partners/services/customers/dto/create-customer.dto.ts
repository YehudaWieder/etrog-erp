import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Unique customer name.', example: 'Fresh Market Ltd' })
  customerName!: string;

  @ApiPropertyOptional({ description: 'Optional unique email address.', example: 'orders@fresh-market.co.il' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Optional unique phone number.', example: '0501234567' })
  phone?: string | null;
}
