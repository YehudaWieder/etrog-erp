import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export type ReclassificationSource = 'SPECIFIC_TRADER' | 'GENERAL' | 'REMAINS_IN_ITALY';

// Changes a quantity's category/grade/pitamStatus without changing ownership, without touching
// the original Classification (sorting) record. See reclassification.service.ts.
export class ResolveReclassificationDto {
  @ApiProperty({
    enum: ['SPECIFIC_TRADER', 'GENERAL', 'REMAINS_IN_ITALY'],
    description:
      'SPECIFIC_TRADER reclassifies one trader\'s own stock. ' +
      'GENERAL drains MODULO first, then pulls any deficit from traders by their TraderCategoryShare ' +
      'percent; the resulting quantity is then either split across traders by share (default) or, when ' +
      'toRemainsInItaly is true, parked as a single row in the REMAINS_IN_ITALY bucket. ' +
      'REMAINS_IN_ITALY withdraws from the remains-in-Italy bucket and always distributes the new ' +
      'classification via the normal GENERAL share split.',
  })
  source!: ReclassificationSource;

  @ApiPropertyOptional({ description: 'Required when source=SPECIFIC_TRADER.' })
  traderId?: number;

  @ApiProperty({ description: 'Trader category of the source classification.' })
  fromTraderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Grade of the source classification.' })
  fromGrade!: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status of the source classification.' })
  fromPitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Trader category of the target classification.' })
  toTraderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Grade of the target classification.' })
  toGrade!: Grade;

  @ApiProperty({ enum: PitamStatus, enumName: 'PitamStatus', description: 'Pitam status of the target classification.' })
  toPitamStatus!: PitamStatus;

  @ApiProperty({ description: 'Quantity to reclassify.' })
  quantity!: number;

  @ApiPropertyOptional({
    description:
      'Only meaningful when source=GENERAL. When true, the reclassified quantity is not split across ' +
      'traders by share - it is parked as a single row in the REMAINS_IN_ITALY bucket instead.',
  })
  toRemainsInItaly?: boolean;

  @ApiPropertyOptional({ description: 'Movement date. Defaults to now.' })
  date?: string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}
