import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PitamStatus } from '@prisma/client';

export class CreateIsraelClassificationDto {
  @ApiProperty({
    description: 'Israel harvest this sorting record belongs to.',
    example: 1,
  })
  harvestId!: number;

  @ApiProperty({
    description:
      "Israel seller/field category (the harvest's field pricing tier).",
    example: 1,
  })
  fieldCategoryId!: number;

  @ApiProperty({ description: 'Israel sort category.', example: 1 })
  categoryId!: number;

  @ApiProperty({
    description: 'Grade code within the chosen category (built-in or custom free-text grade).',
  })
  grade!: string;

  @ApiProperty({
    enum: PitamStatus,
    description: 'Pitam status of this sorting.',
  })
  pitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Sorted quantity.', example: 40 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
