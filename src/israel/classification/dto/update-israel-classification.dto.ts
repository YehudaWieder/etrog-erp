import { ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export class UpdateIsraelClassificationDto {
  @ApiPropertyOptional({ description: "Israel seller/field category (the harvest's field pricing tier).", example: 1 })
  fieldCategoryId?: number;

  @ApiPropertyOptional({ description: 'Israel sort category.', example: 1 })
  categoryId?: number;

  @ApiPropertyOptional({ enum: Grade, description: 'Grade code within the chosen category.' })
  grade?: Grade;

  @ApiPropertyOptional({ enum: PitamStatus, description: 'Pitam status of this sorting.' })
  pitamStatus?: PitamStatus;

  @ApiPropertyOptional({ description: 'Sorted quantity.', example: 40 })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Optional free-text notes.' })
  notes?: string;
}
