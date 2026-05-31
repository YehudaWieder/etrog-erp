import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDefaultTraderCategoryDto {
  @ApiProperty({ description: 'Default trader category name.', example: 'Yanover' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional notes for the category.', example: 'Premium quality etrog' })
  notes?: string;
}
