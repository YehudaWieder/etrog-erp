import { BadRequestException } from '@nestjs/common';
import { Grade, Prisma } from '@prisma/client';
import { CreateDefaultTraderCategoryWithSharesDto } from '../dto/create-default-trader-category-with-shares.dto';
import {
  SHARE_PERCENT_TOTAL_EPSILON,
  validateSharePercentRows,
} from 'src/categories/utils/share-percent-validation.util';

export const DEFAULT_CATEGORY_TOTAL_EPSILON = SHARE_PERCENT_TOTAL_EPSILON;

type SharePreviewRow = {
  traderId: number;
  trader: {
    name: string;
  };
  percent: number | string | { toString(): string };
};

type ApprovalPreviewCategory = {
  id: number;
  name: string;
  notes?: string | null;
  supportedGrades?: Grade[];
  gradeGroups?: Prisma.JsonValue;
  orderIndex: number;
  shares?: SharePreviewRow[];
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeCategoryName(name: string): string {
  return name.trim();
}

export function validateCreateWithSharesPayload(dto: CreateDefaultTraderCategoryWithSharesDto): void {
  validateSharePercentRows(dto.shares ?? []);
}

export function toApprovalResponse(category: ApprovalPreviewCategory) {
  let totalPercent = 0;
  const shares = (category.shares || []).map((share) => {
    const percent = Number(share.percent);
    totalPercent += percent;
    return {
      traderId: share.traderId,
      traderName: share.trader.name,
      percent,
    };
  });

  return {
    id: category.id,
    name: category.name,
    notes: category.notes,
    supportedGrades: category.supportedGrades ?? [],
    gradeGroups: category.gradeGroups ?? [],
    orderIndex: category.orderIndex,
    shares,
    totalPercent: Number(totalPercent.toFixed(2)),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function validateProjectedCategoryTotal(
  existingPercents: Array<{ traderId: number; percent: number | string | { toString(): string } }>,
  newPercent: number,
  categoryId: number,
  excludeTraderId?: number,
): void {
  let total = newPercent;

  for (const share of existingPercents) {
    if (excludeTraderId && share.traderId === excludeTraderId) {
      continue;
    }

    total += Number(share.percent);
  }

  if (total > 100) {
    throw new BadRequestException(
      `Total share percent cannot exceed 100% for category ${categoryId}. Current total would be ${total.toFixed(2)}%.`,
    );
  }
}
