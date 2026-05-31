import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDefaultTraderCategoryDto {
  @ApiProperty({ description: 'Default trader category ID.', example: 1 })
  id!: number;

  @ApiPropertyOptional({ description: 'Updated category name.', example: 'Yanover Premium' })
  name?: string;

  @ApiPropertyOptional({ description: 'Updated notes.', example: 'Updated notes' })
  notes?: string;
}
