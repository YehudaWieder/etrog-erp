import type { HarvestRecord } from '../../../services/harvestsApi';

export type HarvestDailySummaryTotals = {
  totalHarvested: number;
  totalRejected: number;
  uncalculatedRejected: number;
  harvestExcludingBadPicks: number;
  rejectedExcludingBadPicks: number;
  totalNet: number;
};

export function buildHarvestDailySummaryTotals(rows: HarvestRecord[]): HarvestDailySummaryTotals {
  return rows.reduce<HarvestDailySummaryTotals>(
    (totals, row) => {
      totals.totalHarvested += row.totalHarvested;
      totals.totalRejected += row.totalRejected;
      totals.uncalculatedRejected += row.uncalculatedRejected;
      totals.harvestExcludingBadPicks += row.totalHarvested - row.uncalculatedRejected;
      totals.rejectedExcludingBadPicks += row.totalRejected - row.uncalculatedRejected;
      totals.totalNet += Math.max(0, row.totalHarvested - row.totalRejected);
      return totals;
    },
    {
      totalHarvested: 0,
      totalRejected: 0,
      uncalculatedRejected: 0,
      harvestExcludingBadPicks: 0,
      rejectedExcludingBadPicks: 0,
      totalNet: 0,
    },
  );
}