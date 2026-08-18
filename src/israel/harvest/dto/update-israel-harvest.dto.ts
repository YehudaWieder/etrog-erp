import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIsraelHarvestDto {
  @ApiPropertyOptional({ description: 'Israel field/seller this harvest was picked from.', example: 1 })
  fieldId?: number;

  @ApiPropertyOptional({ description: 'Gregorian harvest date (ISO 8601).', example: '2026-09-15' })
  dateGregorian?: string;

  @ApiPropertyOptional({ description: 'Hebrew harvest date, as displayed to users.', example: 'ג׳ תשרי תשפ״ז' })
  dateHebrew?: string;

  @ApiPropertyOptional({ description: 'Total quantity harvested.', example: 120 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
