import { BadRequestException } from '@nestjs/common';
import { Grade, Prisma } from '@prisma/client';
import { CreateDefaultTraderCategoryWithSharesDto } from '../dto/create-default-trader-category-with-shares.dto';

export const DEFAULT_CATEGORY_TOTAL_EPSILON = 0.001;

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
  if (!dto.shares?.length) {
    throw new BadRequestException('At least one trader share row is required.');
  }

  const seenTraderIds = new Set<number>();
  let totalPercent = 0;

  for (const share of dto.shares) {
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

  if (Math.abs(totalPercent - 100) > DEFAULT_CATEGORY_TOTAL_EPSILON) {
    throw new BadRequestException(`Total share percent must be exactly 100%. Current total is ${totalPercent.toFixed(2)}%.`);
  }
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
