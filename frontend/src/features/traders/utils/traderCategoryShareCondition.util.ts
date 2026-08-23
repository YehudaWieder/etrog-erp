import type { TraderCategoryShareCondition, TraderCategoryShareConditionPayload } from '../../../services/traderCategoriesApi';
import type { ConditionDraft, ShareRow } from '../tradersManagement.types';
import { calculateTotalPercent, createEmptyShareRow, isValidSharePercent, TOTAL_EPSILON } from './traderShares.util';

export function createEmptyConditionDraft(): ConditionDraft {
  return {
    name: '',
    startDate: '',
    endDate: '',
    endQuantityThreshold: '',
    endConditionMode: 'EITHER',
    status: 'ACTIVE',
    shares: [createEmptyShareRow(1)],
    hasLinkedStock: false,
    markedForDeletion: false,
  };
}

export function mapConditionToDraft(condition: TraderCategoryShareCondition): ConditionDraft {
  const shares: ShareRow[] = condition.shares.length
    ? condition.shares.map((share, index) => ({
        rowId: index + 1,
        traderId: share.traderId,
        percent: String(share.percent),
      }))
    : [createEmptyShareRow(1)];

  return {
    id: condition.id,
    name: condition.name,
    startDate: condition.startDate.slice(0, 10),
    endDate: condition.endDate ? condition.endDate.slice(0, 10) : '',
    endQuantityThreshold: condition.endQuantityThreshold != null ? String(condition.endQuantityThreshold) : '',
    endConditionMode: condition.endConditionMode,
    status: condition.status,
    shares,
    hasLinkedStock: condition.hasLinkedStock,
    markedForDeletion: false,
  };
}

// Ended conditions are read-only and never resubmitted — callers must filter them out first (see
// isConditionDraftSubmittable). This throws rather than silently reactivating one if that
// invariant is ever violated.
export function mapConditionDraftToPayload(draft: ConditionDraft): TraderCategoryShareConditionPayload {
  if (draft.status === 'ENDED') {
    throw new Error('An ended distribution condition cannot be submitted for editing.');
  }

  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    startDate: draft.startDate,
    ...(draft.endDate ? { endDate: draft.endDate } : {}),
    ...(draft.endQuantityThreshold.trim() !== '' ? { endQuantityThreshold: Number(draft.endQuantityThreshold) } : {}),
    endConditionMode: draft.endConditionMode,
    status: draft.status,
    ...(draft.markedForDeletion ? { action: 'DELETE' as const } : {}),
    shares: draft.shares.map((row) => ({
      traderId: row.traderId as number,
      percent: Number(row.percent),
    })),
  };
}

// ENDED conditions are display-only history — nothing about them changed, so they're left out of
// the save payload entirely rather than resent (which mapConditionDraftToPayload would reject).
export function isConditionDraftSubmittable(draft: ConditionDraft): boolean {
  return draft.status !== 'ENDED';
}

export function formatConditionSharesBreakdown(
  shares: ShareRow[],
  traders: Array<{ id: number; name: string }>,
): string {
  const nameById = new Map(traders.map((trader) => [trader.id, trader.name]));

  return shares
    .filter((row) => row.traderId !== null)
    .map((row) => `${nameById.get(row.traderId as number) ?? `#${row.traderId}`}: ${row.percent}%`)
    .join(', ');
}

// Open-ended (no endDate) sorts after every real date, matching the backend's OPEN_ENDED sentinel
// in assertNoOverlappingActiveCondition.
const OPEN_ENDED_SENTINEL = '9999-12-31';

// Mirrors the backend's assertNoOverlappingActiveCondition (traders-cat-share.service.ts) so the
// same conflict is caught client-side before a save attempt, instead of only after the whole
// category-form save rolls back. Only ACTIVE drafts are checked - a DISABLED one is never "in
// effect" so it can't conflict with anything. `otherDrafts` should be every other condition
// currently staged for this category (existing + newly added, excluding the one being validated).
export function findOverlappingActiveCondition(
  candidate: ConditionDraft,
  otherDrafts: ConditionDraft[],
): ConditionDraft | null {
  if (candidate.status !== 'ACTIVE' || !candidate.startDate) {
    return null;
  }

  const candidateEnd = candidate.endDate || OPEN_ENDED_SENTINEL;

  return (
    otherDrafts.find((other) => {
      if (other.status !== 'ACTIVE' || other.markedForDeletion || !other.startDate) {
        return false;
      }

      const otherEnd = other.endDate || OPEN_ENDED_SENTINEL;
      return other.startDate <= candidateEnd && candidate.startDate <= otherEnd;
    }) ?? null
  );
}

export type ConditionDraftValidationLabels = {
  missingName: string;
  missingStartDate: string;
  invalidDateRange: string;
  missingEndCondition: string;
  atLeastOneShare: string;
  selectTrader: string;
  uniqueTraders: string;
  invalidPercent: string;
  totalMustBeHundred: string;
  overlappingCondition: (name: string) => string;
};

export function validateConditionDraft(
  draft: ConditionDraft,
  labels: ConditionDraftValidationLabels,
  otherDrafts: ConditionDraft[] = [],
): string | null {
  if (!draft.name.trim()) {
    return labels.missingName;
  }

  if (!draft.startDate) {
    return labels.missingStartDate;
  }

  if (draft.endDate && draft.endDate <= draft.startDate) {
    return labels.invalidDateRange;
  }

  if (!draft.endDate && draft.endQuantityThreshold.trim() === '') {
    return labels.missingEndCondition;
  }

  const overlapping = findOverlappingActiveCondition(draft, otherDrafts);
  if (overlapping) {
    return labels.overlappingCondition(overlapping.name);
  }

  if (draft.shares.length === 0) {
    return labels.atLeastOneShare;
  }

  const traderIds = new Set<number>();
  for (const row of draft.shares) {
    if (!row.traderId) {
      return labels.selectTrader;
    }
    if (traderIds.has(row.traderId)) {
      return labels.uniqueTraders;
    }
    traderIds.add(row.traderId);

    if (!isValidSharePercent(row.percent)) {
      return labels.invalidPercent;
    }
  }

  if (Math.abs(calculateTotalPercent(draft.shares) - 100) > TOTAL_EPSILON) {
    return labels.totalMustBeHundred;
  }

  return null;
}
