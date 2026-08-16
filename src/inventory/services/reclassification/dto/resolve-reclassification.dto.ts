import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, PitamStatus } from '@prisma/client';

export type ReclassificationSource = 'SPECIFIC_TRADER' | 'GENERAL' | 'REMAINS_IN_ITALY';

// Changes a quantity's category/grade/pitamStatus and/or ownership (trader private-selection vs.
// general pool) without touching the original Classification (sorting) record.
// See reclassification.service.ts.
export class ResolveReclassificationDto {
  @ApiProperty({
    enum: ['SPECIFIC_TRADER', 'GENERAL', 'REMAINS_IN_ITALY'],
    description:
      'SPECIFIC_TRADER reclassifies one trader\'s own private-selection stock; by default it lands back ' +
      'on the same trader, or, when toGeneral is true, is split into the general pool (or, with ' +
      'toRemainsInItaly, parked in the REMAINS_IN_ITALY bucket) instead. ' +
      'GENERAL drains MODULO first, then pulls any deficit from traders by their TraderCategoryShare ' +
      'percent; the resulting quantity is then either split across traders by share (default), parked ' +
      'as a single row in the REMAINS_IN_ITALY bucket (toRemainsInItaly), or landed in one specific ' +
      'trader\'s private selection (toTraderId). ' +
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
      'Meaningful when source=GENERAL, or when source=SPECIFIC_TRADER with toGeneral=true. When true, ' +
      'the reclassified quantity is not split across traders by share - it is parked as a single row ' +
      'in the REMAINS_IN_ITALY bucket instead. Mutually exclusive with toTraderId.',
  })
  toRemainsInItaly?: boolean;

  @ApiPropertyOptional({
    description:
      'Only meaningful when source=GENERAL. When set, the reclassified quantity is not split across ' +
      'traders by share - it lands as a single row in this trader\'s private selection instead. ' +
      'Mutually exclusive with toRemainsInItaly.',
  })
  toTraderId?: number;

  @ApiPropertyOptional({
    description:
      'Only meaningful when source=SPECIFIC_TRADER. When true, the reclassified quantity leaves the ' +
      'trader\'s private selection and is either split across traders in the target category by their ' +
      'GENERAL share (default), or, when toRemainsInItaly is also true, parked as a single row in the ' +
      'REMAINS_IN_ITALY bucket instead - either way it no longer lands back on the same trader.',
  })
  toGeneral?: boolean;

  @ApiPropertyOptional({ description: 'Movement date. Defaults to now.' })
  date?: string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}
