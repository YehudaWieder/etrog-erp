import { ApiProperty } from '@nestjs/swagger';

export class CreateTraderDto {
  @ApiProperty({ description: 'Unique trader name.', example: 'Trader Cohen' })
  name!: string;
}
