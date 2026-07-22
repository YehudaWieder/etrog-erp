import type { HarvestFieldReportRow } from '../harvestPage.types';

export type HarvestFieldReportSummaryTotals = {
  totalHarvested: number;
  totalRejected: number;
  totalNet: number;
  avgRejectionRate: number;
  avgRejectionRateExcludingBadPicks: number;
  totalRecordCount: number;
  totalFields: number;
};

export function buildHarvestFieldReportSummaryTotals(
  rows: HarvestFieldReportRow[],
  method: 'our' | 'franco' = 'our',
): HarvestFieldReportSummaryTotals {
  let totalHarvested = 0;
  let totalRejected = 0;
  let totalNet = 0;
  let totalRecordCount = 0;
  let totalHarvestedExcludingBadPicks = 0;
  let totalRejectedExcludingBadPicks = 0;

  for (const row of rows) {
    totalHarvested += method === 'franco' ? row.ownerHarvested : row.totalHarvested;
    totalRejected += method === 'franco' ? row.ownerRejected : row.totalRejected;
    totalNet += method === 'franco' ? row.ownerAfterRejected : row.totalAfterRejected;
    totalRecordCount += row.recordCount;
    totalHarvestedExcludingBadPicks +=
      method === 'franco' ? row.ownerHarvestedExcludingBadPicks : row.totalHarvestedExcludingBadPicks;
    totalRejectedExcludingBadPicks +=
      method === 'franco' ? row.ownerRejectedExcludingBadPicks : row.totalRejectedExcludingBadPicks;
  }

  const avgRejectionRate = totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0;
  const avgRejectionRateExcludingBadPicks =
    totalHarvestedExcludingBadPicks > 0
      ? (totalRejectedExcludingBadPicks / totalHarvestedExcludingBadPicks) * 100
      : 0;

  return {
    totalHarvested,
    totalRejected,
    totalNet,
    avgRejectionRate,
    avgRejectionRateExcludingBadPicks,
    totalRecordCount,
    totalFields: rows.length,
  };
}
