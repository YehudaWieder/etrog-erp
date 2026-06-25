import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentType, Grade, PitamStatus } from '@prisma/client';

export class FieldHarvestCreateDto {
  @ApiProperty({ format: 'date-time', example: '2026-10-05T06:00:00.000Z' })
  dateGregorian!: string;

  @ApiProperty({ example: 'י"ב תשרי תשפ"ז' })
  dateHebrew!: string;

  @ApiProperty({ example: 2 })
  fieldId!: number;

  @ApiPropertyOptional({ example: 1500 })
  totalHarvested?: number;

  @ApiPropertyOptional({ example: 0 })
  totalRejected?: number;

  @ApiPropertyOptional({ example: 1200 })
  ownerHarvested?: number;

  @ApiPropertyOptional({ example: 80 })
  ownerRejected?: number;

  @ApiPropertyOptional({ example: 'Field 2 harvest' })
  notes?: string;
}

export class FieldHarvestUpdateDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 2 })
  fieldId?: number;

  @ApiPropertyOptional({ example: 1630 })
  totalHarvested?: number;

  @ApiPropertyOptional({ example: 90 })
  totalRejected?: number;

  @ApiPropertyOptional({ example: 1200 })
  ownerHarvested?: number;

  @ApiPropertyOptional({ example: 50 })
  ownerRejected?: number;

  @ApiPropertyOptional({ example: 'Updated after quality review' })
  notes?: string;
}

export class ClassificationBulkItemDto {
  @ApiProperty({ enum: AssignmentType, enumName: 'AssignmentType' })
  assignmentType!: AssignmentType;

  @ApiPropertyOptional()
  traderId?: number;

  @ApiPropertyOptional()
  customerId?: number;

  @ApiPropertyOptional()
  traderCategoryId?: number;

  @ApiPropertyOptional()
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade' })
  grade?: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus' })
  pitamStatus!: PitamStatus;

  @ApiProperty({ example: 120 })
  quantity!: number;

  @ApiPropertyOptional()
  notes?: string;
}

export class HarvestInlineUpdateDto {
  @ApiPropertyOptional()
  totalHarvested?: number;

  @ApiPropertyOptional()
  totalRejected?: number;

  @ApiPropertyOptional()
  ownerHarvested?: number;

  @ApiPropertyOptional()
  ownerRejected?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  updatedById?: number;
}

export class CreateHarvestClassificationDto extends ClassificationBulkItemDto {
  @ApiProperty({ example: 1 })
  harvestId!: number;

  @ApiProperty({ example: true })
  isPartialClassification!: boolean;

  @ApiPropertyOptional({ type: HarvestInlineUpdateDto })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class RestoreClassificationDto extends CreateHarvestClassificationDto {
  @ApiProperty({ example: 1, description: 'ID of the soft-deleted classification to permanently remove after restore' })
  deletedClassificationId!: number;
}

export class UpdateHarvestClassificationDto {
  @ApiProperty({ example: 1 })
  harvestId!: number;

  @ApiProperty({ example: 1 })
  classificationId!: number;

  @ApiProperty({ example: true })
  isPartialClassification!: boolean;

  @ApiPropertyOptional({ enum: AssignmentType, enumName: 'AssignmentType' })
  assignmentType?: AssignmentType;

  @ApiPropertyOptional()
  traderId?: number;

  @ApiPropertyOptional()
  customerId?: number;

  @ApiPropertyOptional()
  traderCategoryId?: number;

  @ApiPropertyOptional()
  customerCategoryId?: number;

  @ApiPropertyOptional({ enum: Grade, enumName: 'Grade' })
  grade?: Grade;

  @ApiPropertyOptional({ enum: PitamStatus, enumName: 'PitamStatus' })
  pitamStatus?: PitamStatus;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ type: HarvestInlineUpdateDto })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class DeleteHarvestClassificationDto {
  @ApiProperty({ example: 1 })
  harvestId!: number;

  @ApiProperty({ example: 1 })
  classificationId!: number;

  @ApiProperty({ example: true })
  isPartialClassification!: boolean;

  @ApiPropertyOptional({ type: HarvestInlineUpdateDto })
  harvestUpdate?: HarvestInlineUpdateDto;
}

export class UpdateHarvestPartialClassificationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: true })
  isPartialClassification!: boolean;
}

export class HarvestBulkCreateDto {
  @ApiProperty({ format: 'date-time', example: '2026-10-05T06:00:00.000Z' })
  dateGregorian!: string;

  @ApiProperty({ example: 'י"ב תשרי תשפ"ז' })
  dateHebrew!: string;

  @ApiProperty({ example: 2 })
  fieldId!: number;

  @ApiPropertyOptional({ example: 1500 })
  totalHarvested?: number;

  @ApiPropertyOptional({ example: 50 })
  totalRejected?: number;

  @ApiPropertyOptional({ example: 1000 })
  ownerHarvested?: number;

  @ApiPropertyOptional({ example: 30 })
  ownerRejected?: number;

  @ApiPropertyOptional({ example: 'Morning harvest' })
  notes?: string;

  @ApiPropertyOptional({ example: true })
  isPartialClassification?: boolean;

  @ApiPropertyOptional({ type: [ClassificationBulkItemDto] })
  classifications?: ClassificationBulkItemDto[];
}
