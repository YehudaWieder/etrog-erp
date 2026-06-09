import type { HarvestRecord } from '../../../services/harvestsApi';

export type HarvestDailySummaryTotals = {
  totalHarvested: number;
  totalRejected: number;
  totalNet: number;
};

export function buildHarvestDailySummaryTotals(rows: HarvestRecord[]): HarvestDailySummaryTotals {
  return rows.reduce<HarvestDailySummaryTotals>(
    (totals, row) => {
      totals.totalHarvested += row.totalHarvested;
      totals.totalRejected += row.totalRejected;
      totals.totalNet += Math.max(0, row.totalHarvested - row.totalRejected);
      return totals;
    },
    {
      totalHarvested: 0,
      totalRejected: 0,
      totalNet: 0,
    },
  );
}