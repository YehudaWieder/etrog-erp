import { ApiProperty } from '@nestjs/swagger';

export class FieldCreateDto {
  @ApiProperty({ description: 'Unique field name.', example: 'Block A' })
  name!: string;
}
