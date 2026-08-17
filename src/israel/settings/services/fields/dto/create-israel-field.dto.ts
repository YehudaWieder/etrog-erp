import { ApiProperty } from '@nestjs/swagger';

export class CreateIsraelFieldDto {
  @ApiProperty({ description: 'Unique seller/field name.', example: 'Moshe Cohen' })
  name!: string;
}
