import { Prisma } from '@prisma/client';
import { calculateMaximalDistributableByShares } from './share-math';

export type ResolvedTraderCategoryShare = { traderId: number; percent: Prisma.Decimal };

export type ResolvedTraderCategoryShares = {
  shares: ResolvedTraderCategoryShare[];
  shareConditionId: number | null;
};

// One chunk of a positive (trader-increasing) quantity movement, to be created as its own tagged
// TraderStock batch. A single incoming quantity can produce up to two segments when it straddles
// a condition's quantity threshold — see resolveTraderCategoryShareAllocationSegments.
export type ShareAllocationSegment = {
  quantity: number;
  shares: ResolvedTraderCategoryShare[];
  shareConditionId: number | null;
};

type CandidateConditionRow = {
  id: number;
  endDate: Date | null;
  endQuantityThreshold: number | null;
  endConditionMode: 'EITHER' | 'BOTH';
};

// Locks (FOR UPDATE) and returns the one ACTIVE condition whose date range covers `date`, if any.
// Row lock: without this, two concurrent operations could both read the condition as still active
// and both write past its quantity threshold before either sees the other's rows (Postgres default
// isolation, READ COMMITTED, does not prevent this on its own).
async function lockCandidateCondition(
  tx: Prisma.TransactionClient,
  params: { seasonId: number; traderCategoryId: number; date: Date },
): Promise<CandidateConditionRow | undefined> {
  const candidates = await tx.$queryRaw<CandidateConditionRow[]>`
    SELECT "id", "endDate", "endQuantityThreshold", "endConditionMode"
    FROM "TraderCategoryShareCondition"
    WHERE "seasonId" = ${params.seasonId}
      AND "traderCategoryId" = ${params.traderCategoryId}
      AND "status" = 'ACTIVE'
      AND "startDate" <= ${params.date}
    ORDER BY "startDate" DESC
    LIMIT 1
    FOR UPDATE
  `;

  return candidates[0];
}

// Net sum (allocations and deductions together) of every TraderStock row tagged with this
// condition, so a deleted/undone batch (deletion is how every reversal in this system works)
// is automatically reflected without any separate counter to keep in sync.
async function getAccumulatedConditionQuantity(tx: Prisma.TransactionClient, shareConditionId: number): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ sum: bigint | number | null }>>`
    SELECT COALESCE(SUM("quantity"), 0) AS sum
    FROM "TraderStock"
    WHERE "shareConditionId" = ${shareConditionId}
  `;

  return Math.max(0, Number(rows[0]?.sum ?? 0));
}

async function endCondition(tx: Prisma.TransactionClient, conditionId: number) {
  await tx.traderCategoryShareCondition.update({
    where: { id: conditionId },
    data: { status: 'ENDED' },
  });
}

async function findDefaultShares(
  tx: Prisma.TransactionClient,
  params: { seasonId: number; traderCategoryId: number },
): Promise<ResolvedTraderCategoryShare[]> {
  return tx.traderCategoryShare.findMany({
    where: { seasonId: params.seasonId, traderCategoryId: params.traderCategoryId, shareConditionId: null },
    orderBy: { traderId: 'asc' },
    select: { traderId: true, percent: true },
  });
}

async function findConditionShares(tx: Prisma.TransactionClient, shareConditionId: number): Promise<ResolvedTraderCategoryShare[]> {
  return tx.traderCategoryShare.findMany({
    where: { shareConditionId },
    orderBy: { traderId: 'asc' },
    select: { traderId: true, percent: true },
  });
}

// A raw threshold like 50 may not be a multiple of the condition's own "fair step" (e.g. 35/35/30
// needs multiples of 20) - snapping it down to the largest reachable multiple means the condition
// actually terminates once it gets there, instead of stalling forever a few units short of a target
// its own percentages can never land on exactly (which would otherwise leave a small remainder
// permanently bouncing into modulo while the condition sits ACTIVE indefinitely).
function getEffectiveQuantityThreshold(threshold: number, conditionShares: ResolvedTraderCategoryShare[]): number {
  return calculateMaximalDistributableByShares(
    threshold,
    conditionShares.map((share) => share.percent.toString()),
  );
}

// Single choke point for reading a category's trader-split percents for a movement whose own
// direction/quantity doesn't matter (deductions, and any other non-allocation movement). Once a
// condition has ended (by date or by quantity threshold - "if it's ended, it's ended"), this
// never reactivates it: a deduction that happens to bring the accumulated quantity back under the
// threshold still uses whatever is currently active (default, or a later condition), exactly like
// editing the season's default percents already affects future movements regardless of what
// percents were in effect when the stock was originally added.
//
// Every caller must run this inside the same transaction that will create the resulting
// TraderStock rows, tagging them with the returned shareConditionId.
export async function resolveTraderCategoryShares(
  tx: Prisma.TransactionClient,
  params: { seasonId: number; traderCategoryId: number; date: Date },
): Promise<ResolvedTraderCategoryShares> {
  const candidate = await lockCandidateCondition(tx, params);

  if (candidate) {
    const conditionShares = await findConditionShares(tx, candidate.id);
    const accumulated = await getAccumulatedConditionQuantity(tx, candidate.id);

    const dateReached = candidate.endDate != null && params.date >= candidate.endDate;
    const quantityReached =
      candidate.endQuantityThreshold != null &&
      accumulated >= getEffectiveQuantityThreshold(candidate.endQuantityThreshold, conditionShares);
    const endReached =
      candidate.endConditionMode === 'BOTH' ? dateReached && quantityReached : dateReached || quantityReached;

    if (!endReached) {
      return { shares: conditionShares, shareConditionId: candidate.id };
    }

    await endCondition(tx, candidate.id);
  }

  return { shares: await findDefaultShares(tx, params), shareConditionId: null };
}

// Choke point for a POSITIVE (trader-increasing) quantity movement — the only direction that ever
// splits at a condition's quantity threshold. Deductions never call this: "if it's ended, it's
// ended" — only inbound quantity gets capped precisely at the threshold. A leftover that merely
// fails to complete a full fair-share step (rather than overshooting the cap) only rolls over into
// the default segment once this movement actually ends the condition; otherwise it stays tagged to
// the condition and falls into the modulo pool to wait for more quantity. This applies regardless
// of which of the 8 operations the quantity movement belongs to (e.g. tryAssignFromModuloPool
// splits the same way whether it was triggered by an allocation or as a side effect of a
// deduction's modulo-remainder sweep).
//
// Returns 1 segment in the common case (no active condition, or the whole quantity fits under/over
// the threshold on one side), or 2 segments when `quantity` straddles the threshold - the caller
// must create each segment as its own tagged TraderStock batch (same MovementReferenceId).
export async function resolveTraderCategoryShareAllocationSegments(
  tx: Prisma.TransactionClient,
  params: { seasonId: number; traderCategoryId: number; date: Date },
  quantity: number,
): Promise<ShareAllocationSegment[]> {
  const candidate = await lockCandidateCondition(tx, params);

  if (!candidate) {
    return [{ quantity, shares: await findDefaultShares(tx, params), shareConditionId: null }];
  }

  const accumulated = await getAccumulatedConditionQuantity(tx, candidate.id);
  const dateReached = candidate.endDate != null && params.date >= candidate.endDate;

  // Date alone ends an EITHER condition immediately - a single point-in-time movement can't
  // straddle a date boundary the way it can a quantity threshold, so there's nothing to split.
  if (dateReached && candidate.endConditionMode !== 'BOTH') {
    await endCondition(tx, candidate.id);
    return [{ quantity, shares: await findDefaultShares(tx, params), shareConditionId: null }];
  }

  if (candidate.endQuantityThreshold == null) {
    // No quantity cap configured - nothing to split against.
    return [{ quantity, shares: await findConditionShares(tx, candidate.id), shareConditionId: candidate.id }];
  }

  const conditionShares = await findConditionShares(tx, candidate.id);
  const effectiveThreshold = getEffectiveQuantityThreshold(candidate.endQuantityThreshold, conditionShares);

  const room = Math.max(0, effectiveThreshold - accumulated);
  const conditionPortion =
    room > 0 ? calculateMaximalDistributableByShares(Math.min(quantity, room), conditionShares.map((share) => share.percent.toString())) : 0;
  const leftover = quantity - conditionPortion;

  const quantityReachedAfter = accumulated + conditionPortion >= effectiveThreshold;
  const endReached = candidate.endConditionMode === 'BOTH' ? dateReached && quantityReachedAfter : dateReached || quantityReachedAfter;

  const segments: ShareAllocationSegment[] = [];

  if (conditionPortion > 0) {
    segments.push({ quantity: conditionPortion, shares: conditionShares, shareConditionId: candidate.id });
  }

  if (leftover > 0) {
    // A leftover that doesn't complete a full "fair step" under the condition's own percentages
    // (e.g. 10 of a 50-unit harvest at 35/35/30, step 20) is not the same as quantity that
    // overshot the cap. While the condition still has room for another full step, this leftover
    // must stay pending rather than default immediately - tagging it with the condition's own
    // shares means it will fail canDistributeToAll and fall into the modulo pool (see
    // general-share-allocation.service.ts), where the next harvest's sweep re-resolves it against
    // the (still active) condition and may complete a fresh step. Only once this movement actually
    // ends the condition (cap fully reached, or date reached) is there nothing left to wait for,
    // so the leftover defaults immediately instead of sitting in modulo forever.
    if (endReached) {
      segments.push({ quantity: leftover, shares: await findDefaultShares(tx, params), shareConditionId: null });
    } else {
      segments.push({ quantity: leftover, shares: conditionShares, shareConditionId: candidate.id });
    }
  }

  if (endReached) {
    await endCondition(tx, candidate.id);
  }

  return segments;
}
