import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldUpdateDto {
  @ApiProperty({ description: 'Field ID to update.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'New unique field name.', example: 'Block A North' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Whether this field is included in the overall rejection rate summary.',
    example: true,
  })
  includeInRejectionSummary?: boolean;
}
