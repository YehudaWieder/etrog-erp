import { ApiProperty } from '@nestjs/swagger';

export class SeasonIdDto {
  @ApiProperty({ description: 'Season ID.', example: 1 })
  id!: number;
}
