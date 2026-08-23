import { BadRequestException } from '@nestjs/common';

export const SHARE_PERCENT_TOTAL_EPSILON = 0.001;

export type SharePercentRow = {
  traderId: number | string;
  percent: number | string;
};

// Shared by TraderCategoryShare, TraderCategoryShareCondition and DefaultTraderCategoryShare
// payloads: every trader row must be positive/unique, and the rows must sum to exactly 100%.
export function validateSharePercentRows(shares: SharePercentRow[]): void {
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

  if (Math.abs(totalPercent - 100) > SHARE_PERCENT_TOTAL_EPSILON) {
    throw new BadRequestException(`Total share percent must be exactly 100%. Current total is ${totalPercent.toFixed(2)}%.`);
  }
}
