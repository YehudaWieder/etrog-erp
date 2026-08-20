import { ApiProperty } from '@nestjs/swagger';

export class DeleteIsraelBoxesBulkDto {
  @ApiProperty({ description: 'IDs of the boxes to permanently delete.', example: [101, 102, 103], type: [Number] })
  ids!: number[];
}
