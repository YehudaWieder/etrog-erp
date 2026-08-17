import { ApiProperty } from '@nestjs/swagger';

export class UpdateIsraelFieldDto {
  @ApiProperty({ description: 'Israel field ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique seller/field name.', example: 'Moshe Cohen' })
  name!: string;
}
