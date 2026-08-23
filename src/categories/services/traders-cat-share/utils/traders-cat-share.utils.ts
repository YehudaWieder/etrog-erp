import { BadRequestException } from '@nestjs/common';
import { Grade, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import type { TraderShareRowDto } from '../dto/trader-share-row.dto';
import {
  SHARE_PERCENT_TOTAL_EPSILON,
  validateSharePercentRows,
} from 'src/categories/utils/share-percent-validation.util';

export const CATEGORY_TOTAL_EPSILON = SHARE_PERCENT_TOTAL_EPSILON;

export type TraderCategoryWithSharesRecord = {
  id: number;
  seasonId: number;
  name: string;
  notes: string | null;
  supportedGrades: Grade[];
  gradeGroups: Prisma.JsonValue;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  traderCategoryShares: Array<{
    traderId: number;
    percent: Prisma.Decimal;
    trader: { name: string };
  }>;
  traderCategoryShareConditions: Array<{
    id: number;
    name: string;
    startDate: Date;
    endDate: Date | null;
    endQuantityThreshold: number | null;
    endConditionMode: string;
    status: string;
    shares: Array<{
      traderId: number;
      percent: Prisma.Decimal;
      trader: { name: string };
    }>;
    _count: { traderStock: number };
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
  validateSharePercentRows(shares);
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

  const conditions = record.traderCategoryShareConditions.map((conditionRecord) => ({
    id: conditionRecord.id,
    name: conditionRecord.name,
    startDate: conditionRecord.startDate,
    endDate: conditionRecord.endDate,
    endQuantityThreshold: conditionRecord.endQuantityThreshold,
    endConditionMode: conditionRecord.endConditionMode,
    status: conditionRecord.status,
    hasLinkedStock: conditionRecord._count.traderStock > 0,
    shares: conditionRecord.shares.map((share) => ({
      traderId: share.traderId,
      traderName: share.trader.name,
      percent: Number(share.percent),
    })),
  }));

  return {
    id: record.id,
    seasonId: record.seasonId,
    name: record.name,
    notes: record.notes,
    supportedGrades: record.supportedGrades,
    gradeGroups: record.gradeGroups,
    orderIndex: record.orderIndex,
    shares,
    totalPercent: Number(totalPercent.toFixed(2)),
    conditions,
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
