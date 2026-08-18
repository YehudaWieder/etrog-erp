import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIsraelHarvestDto {
  @ApiProperty({ description: 'Season this harvest belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Israel field/seller this harvest was picked from.', example: 1 })
  fieldId!: number;

  @ApiProperty({ description: 'Gregorian harvest date (ISO 8601).', example: '2026-09-15' })
  dateGregorian!: string;

  @ApiProperty({ description: 'Hebrew harvest date, as displayed to users.', example: 'ג׳ תשרי תשפ״ז' })
  dateHebrew!: string;

  @ApiProperty({ description: 'Total quantity harvested.', example: 120 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
