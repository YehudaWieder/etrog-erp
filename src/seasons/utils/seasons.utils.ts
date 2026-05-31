import { BadRequestException } from '@nestjs/common';

export const MIN_SEASON_YEAR = 2020;
export const MAX_SEASON_YEAR = 2100;

type PreviewShare = {
  traderId: number;
  trader: {
    name: string;
  };
  percent: number | string | { toString(): string };
};

type PreviewCategory = {
  id: number;
  name: string;
  notes: string | null;
  shares?: PreviewShare[];
};

export function normalizeAndValidateSeasonYear(yearName: unknown): number {
  const normalizedYear = typeof yearName === 'string' ? Number(yearName.trim()) : yearName;

  const isValidYear =
    typeof normalizedYear === 'number' &&
    Number.isInteger(normalizedYear) &&
    normalizedYear >= MIN_SEASON_YEAR &&
    normalizedYear <= MAX_SEASON_YEAR;

  if (!isValidYear) {
    throw new BadRequestException(
      `yearName must be an integer between ${MIN_SEASON_YEAR} and ${MAX_SEASON_YEAR}`,
    );
  }

  return normalizedYear;
}

export function mapDefaultTraderCategoryPreview(category: PreviewCategory) {
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
    shares,
    totalPercent: Number(totalPercent.toFixed(2)),
  };
}

export function parseSeasonIdOrSlug(idOrSlug: string): string | number {
  const id = Number.parseInt(idOrSlug, 10);
  return Number.isNaN(id) ? idOrSlug : id;
}
