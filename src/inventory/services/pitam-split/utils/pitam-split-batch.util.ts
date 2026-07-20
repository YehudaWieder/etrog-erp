import { Grade, Prisma } from '@prisma/client';

export type PitamSplitBatchRow = Prisma.TraderStockGetPayload<{
  include: { trader: { select: { id: true; name: true } } };
}>;

export type PitamSplitBatchSource = 'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL';

export type PitamSplitBatchSummary = {
  batchId: string;
  seasonId: number;
  date: Date;
  traderCategoryId: number;
  grade: Grade;
  source: PitamSplitBatchSource;
  traderId: number | null;
  traderName: string | null;
  affectedCount: number;
  withQty: number;
  withoutQty: number;
  notes: string | null;
};

// One resolve() call creates one negative/positive triple per affected trader (plus modulo).
// Groups those raw ledger rows back into one summary per batchId — the "one undo-able action"
// the user actually performed, regardless of how many rows it produced underneath.
export function groupPitamSplitRowsIntoBatches(rows: PitamSplitBatchRow[]): PitamSplitBatchSummary[] {
  const byBatch = new Map<string, PitamSplitBatchRow[]>();

  for (const row of rows) {
    if (!row.pitamSplitBatchId) continue;
    const existing = byBatch.get(row.pitamSplitBatchId);
    if (existing) {
      existing.push(row);
    } else {
      byBatch.set(row.pitamSplitBatchId, [row]);
    }
  }

  const summaries: PitamSplitBatchSummary[] = [];

  for (const [batchId, batchRows] of byBatch) {
    const affectedKeys = new Set(batchRows.map((row) => (row.isModulo ? 'MODULO' : `TRADER:${row.traderId}`)));
    const isSingleModulo = affectedKeys.size === 1 && batchRows[0].isModulo;
    const isSingleTrader = affectedKeys.size === 1 && !batchRows[0].isModulo;

    const source: PitamSplitBatchSource = isSingleModulo ? 'MODULO' : isSingleTrader ? 'SPECIFIC_TRADER' : 'GENERAL';
    const representative = batchRows[0];
    const traderRow = isSingleTrader ? batchRows.find((row) => row.trader) : undefined;

    summaries.push({
      batchId,
      seasonId: representative.seasonId,
      date: representative.date,
      traderCategoryId: representative.traderCategoryId,
      grade: representative.grade,
      source,
      traderId: isSingleTrader ? representative.traderId : null,
      traderName: traderRow?.trader?.name ?? null,
      affectedCount: affectedKeys.size,
      withQty: batchRows.filter((row) => row.pitamStatus === 'WITH_PITAM').reduce((sum, row) => sum + row.quantity, 0),
      withoutQty: batchRows.filter((row) => row.pitamStatus === 'WITHOUT_PITAM').reduce((sum, row) => sum + row.quantity, 0),
      notes: batchRows.find((row) => row.notes)?.notes ?? null,
    });
  }

  return summaries.sort((left, right) => right.date.getTime() - left.date.getTime());
}
