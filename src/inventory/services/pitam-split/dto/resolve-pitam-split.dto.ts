import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade } from '@prisma/client';

export type PitamSplitSource = 'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL';

// Resolves part of a trader's MIXED pitam balance into WITH_PITAM/WITHOUT_PITAM, without touching
// the original Classification (sorting) record. See pitam-split.service.ts.
// Trader-only: a customer always has a definite pitam status, so there is nothing to resolve there.
export class ResolvePitamSplitDto {
  @ApiProperty({
    enum: ['SPECIFIC_TRADER', 'MODULO', 'GENERAL'],
    description:
      'SPECIFIC_TRADER splits one trader\'s own MIXED stock. ' +
      'MODULO splits only the unassigned/modulo MIXED stock. GENERAL splits proportionally across every ' +
      'trader\'s own MIXED stock by their TraderCategoryShare percent, falling back to modulo for any ' +
      'remainder no trader can absorb (same fallback behavior as ordinary general packing/sorting).',
  })
  source!: PitamSplitSource;

  @ApiPropertyOptional({ description: 'Required when source=SPECIFIC_TRADER.' })
  traderId?: number;

  @ApiProperty({ description: 'Trader category to resolve MIXED stock in.' })
  traderCategoryId!: number;

  @ApiProperty({ enum: Grade, enumName: 'Grade', description: 'Etrog grade to resolve MIXED stock in.' })
  grade!: Grade;

  @ApiProperty({ description: 'Quantity to resolve as WITH_PITAM.' })
  withQty!: number;

  @ApiProperty({ description: 'Quantity to resolve as WITHOUT_PITAM.' })
  withoutQty!: number;

  @ApiPropertyOptional({ description: 'Movement date. Defaults to now.' })
  date?: string;

  @ApiPropertyOptional({ description: 'Optional notes.' })
  notes?: string;
}
