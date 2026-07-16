import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldCreateDto {
  @ApiProperty({ description: 'Unique field name.', example: 'Block A' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Whether this field is included in the overall rejection rate summary. Defaults to true.',
    example: true,
  })
  includeInRejectionSummary?: boolean;
}
