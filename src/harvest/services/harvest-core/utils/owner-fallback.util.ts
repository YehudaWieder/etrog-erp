import { Prisma } from '@prisma/client';

export type HarvestOwnerFallbackRow = {
  totalHarvested: number;
  totalRejected: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  ownerRejectionRate: Prisma.Decimal | number | null;
};

export function hasExplicitOwnerData(row: HarvestOwnerFallbackRow): boolean {
  return (
    row.ownerHarvested > 0 ||
    row.ownerRejected > 0 ||
    row.ownerAfterRejected > 0 ||
    Number(row.ownerRejectionRate ?? 0) > 0
  );
}

export function normalizeOwnerInputs(params: {
  totalHarvested: number;
  totalRejected: number;
  ownerHarvested?: number;
  ownerRejected?: number;
}): { ownerHarvested: number; ownerRejected: number } {
  const ownerProvided = params.ownerHarvested !== undefined || params.ownerRejected !== undefined;

  if (!ownerProvided) {
    return {
      ownerHarvested: params.totalHarvested,
      ownerRejected: params.totalRejected,
    };
  }

  return {
    ownerHarvested: Number(params.ownerHarvested) || 0,
    ownerRejected: Number(params.ownerRejected) || 0,
  };
}
