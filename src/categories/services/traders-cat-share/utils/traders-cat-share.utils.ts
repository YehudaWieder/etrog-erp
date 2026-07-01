import { BadRequestException } from '@nestjs/common';
import { Grade, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import type { TraderShareRowDto } from '../dto/trader-share-row.dto';

export const CATEGORY_TOTAL_EPSILON = 0.001;

export type TraderCategoryWithSharesRecord = {
  id: number;
  seasonId: number;
  name: string;
  notes: string | null;
  supportedGrades: Grade[];
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  traderCategoryShares: Array<{
    traderId: number;
    percent: Prisma.Decimal;
    trader: { name: string };
  }>;
};

export type TraderShareWorkerViewRecord = {
  id: number;
  traderId: number;
  percent: Prisma.Decimal;
  traderCategory: { name: string };
  trader: { name: string };
};

export function validateSharesPayload(shares: TraderShareRowDto[]) {
  if (!shares?.length) {
    throw new BadRequestException('At least one trader share row is required.');
  }

  const seenTraderIds = new Set<number>();
  let totalPercent = 0;

  for (const share of shares) {
    const traderId = Number(share.traderId);
    const percent = Number(share.percent);

    if (!Number.isInteger(traderId) || traderId <= 0) {
      throw new BadRequestException('Each share row must include a valid trader ID.');
    }

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new BadRequestException('Each share percent must be a number greater than 0 and up to 100.');
    }

    if (seenTraderIds.has(traderId)) {
      throw new BadRequestException('Trader rows must be unique within a category.');
    }

    seenTraderIds.add(traderId);
    totalPercent += percent;
  }

  if (Math.abs(totalPercent - 100) > CATEGORY_TOTAL_EPSILON) {
    throw new BadRequestException(`Total share percent must be exactly 100%. Current total is ${totalPercent.toFixed(2)}%.`);
  }
}

export function transformCategoryWithShares(record: TraderCategoryWithSharesRecord) {
  let totalPercent = 0;
  const shares = record.traderCategoryShares.map((share) => {
    const percent = Number(share.percent);
    totalPercent += percent;
    return {
      traderId: share.traderId,
      traderName: share.trader.name,
      percent,
    };
  });

  return {
    id: record.id,
    seasonId: record.seasonId,
    name: record.name,
    notes: record.notes,
    supportedGrades: record.supportedGrades,
    orderIndex: record.orderIndex,
    shares,
    totalPercent: Number(totalPercent.toFixed(2)),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function extractPercentValue(
  percentInput: Prisma.TraderCategoryShareUpdateInput['percent'],
): number | undefined {
  if (percentInput === undefined) {
    return undefined;
  }

  if (
    typeof percentInput === 'object' &&
    percentInput !== null &&
    'set' in percentInput
  ) {
    const value = Number(percentInput.set);
    if (Number.isNaN(value)) {
      throw new BadRequestException('Invalid percent value');
    }
    return value;
  }

  const value = Number(percentInput as number | string);
  if (Number.isNaN(value)) {
    throw new BadRequestException('Invalid percent value');
  }
  return value;
}

export function isManagerOrAbove(actor: AuthenticatedUser): boolean {
  return actor.role === Role.MANAGER || actor.role === Role.OWNER;
}

export function toWorkerShareView(record: TraderShareWorkerViewRecord) {
  return {
    id: record.id,
    traderId: record.traderId,
    name: record.traderCategory.name,
    grade: null,
    percent: Number(record.percent),
    notes: null,
    traderName: record.trader.name,
  };
}
