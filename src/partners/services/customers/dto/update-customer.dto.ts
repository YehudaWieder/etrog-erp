import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiProperty({ description: 'Customer ID to update.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated customer name.', example: 'Global Fruits GmbH' })
  customerName?: string;

  @ApiPropertyOptional({ description: 'Updated email address.', example: 'logistics@globalfruits.eu' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Updated phone number.', example: '0527654321' })
  phone?: string | null;
}
