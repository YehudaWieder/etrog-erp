import { ApiProperty } from '@nestjs/swagger';

export class FieldUpdateDto {
  @ApiProperty({ description: 'Field ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique field name.', example: 'Block A North' })
  name!: string;
}
