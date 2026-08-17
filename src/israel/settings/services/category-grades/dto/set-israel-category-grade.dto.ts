import { ApiProperty } from '@nestjs/swagger';

export class SetIsraelCategoryGradeDto {
  @ApiProperty({ description: 'Season ID this grade set belongs to.', example: 1 })
  seasonId!: number;

  @ApiProperty({ description: 'Israel sorting category ID this grade set belongs to.', example: 1 })
  categoryId!: number;

  @ApiProperty({
    description: 'Map of grade key to display name.',
    example: { A: 'Mehudar', B: 'A Grade', C: 'B Grade' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  grades!: Record<string, string>;
}
