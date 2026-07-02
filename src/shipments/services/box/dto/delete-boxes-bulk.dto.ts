import { ApiProperty } from '@nestjs/swagger';

export class DeleteBoxesBulkDto {
  @ApiProperty({ description: 'IDs of the boxes to permanently delete.', example: [101, 102, 103], type: [Number] })
  ids!: number[];
}
