import { ApiProperty } from '@nestjs/swagger';

export class SeasonYearNameDto {
  @ApiProperty({
    description: 'Season year name.',
    example: 2026,
    minimum: 2020,
    maximum: 2100,
  })
  yearName!: number;
}
