import { ApiProperty } from '@nestjs/swagger';

export class CreateIsraelSortCategoryDto {
  @ApiProperty({ description: 'Unique sorting category name.', example: 'Mehudar' })
  name!: string;
}
