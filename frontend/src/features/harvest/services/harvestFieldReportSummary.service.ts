import type { HarvestFieldReportRow } from '../harvestPage.types';

export type HarvestFieldReportSummaryTotals = {
  totalHarvested: number;
  totalNet: number;
  avgRejectionRate: number;
};

export function buildHarvestFieldReportSummaryTotals(rows: HarvestFieldReportRow[]): HarvestFieldReportSummaryTotals {
  let totalHarvested = 0;
  let totalRejected = 0;
  let totalNet = 0;

  for (const row of rows) {
    totalHarvested += row.totalHarvested;
    totalRejected += row.totalRejected;
    totalNet += row.totalAfterRejected;
  }

  const avgRejectionRate = totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0;

  return { totalHarvested, totalNet, avgRejectionRate };
}
