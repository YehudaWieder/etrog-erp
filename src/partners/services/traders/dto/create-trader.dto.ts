import { ApiProperty } from '@nestjs/swagger';

export class CreateTraderDto {
  @ApiProperty({ description: 'Unique trader name.', example: 'Trader Cohen' })
  name!: string;

  @ApiProperty({ description: 'Payment percentage for the trader.', example: 12.5 })
  paymentPercent!: number;
}
