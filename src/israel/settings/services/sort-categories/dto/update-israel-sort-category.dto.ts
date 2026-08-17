import { ApiProperty } from '@nestjs/swagger';

export class UpdateIsraelSortCategoryDto {
  @ApiProperty({ description: 'Israel sorting category ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique sorting category name.', example: 'Mehudar' })
  name!: string;
}
