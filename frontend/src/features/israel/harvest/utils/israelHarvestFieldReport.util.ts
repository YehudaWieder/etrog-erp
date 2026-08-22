import type { IsraelHarvestRecord } from '../../../../services/israel/israelHarvestsApi';
import type { IsraelHarvestFieldReportRow } from '../israelHarvestPage.types';

export function buildIsraelHarvestFieldReportRows(
  records: IsraelHarvestRecord[],
): IsraelHarvestFieldReportRow[] {
  const totalsByField = new Map<
    number,
    { fieldName: string; recordCount: number; totalQuantity: number }
  >();

  for (const record of records) {
    const fieldId = record.fieldId;
    const fieldName = record.field?.name ?? '';
    const entry = totalsByField.get(fieldId) ?? {
      fieldName,
      recordCount: 0,
      totalQuantity: 0,
    };
    entry.recordCount += 1;
    entry.totalQuantity += record.quantity;
    totalsByField.set(fieldId, entry);
  }

  return Array.from(totalsByField.entries()).map(([fieldId, totals]) => ({
    id: fieldId,
    fieldName: totals.fieldName,
    recordCount: totals.recordCount,
    totalQuantity: totals.totalQuantity,
    avgQuantityPerHarvest:
      totals.recordCount > 0 ? totals.totalQuantity / totals.recordCount : 0,
  }));
}

export type IsraelHarvestFieldReportSummaryTotals = {
  totalQuantity: number;
  totalRecordCount: number;
  totalFields: number;
  avgQuantityPerHarvest: number;
};

export function buildIsraelHarvestFieldReportSummaryTotals(
  rows: IsraelHarvestFieldReportRow[],
): IsraelHarvestFieldReportSummaryTotals {
  const totalQuantity = rows.reduce((sum, row) => sum + row.totalQuantity, 0);
  const totalRecordCount = rows.reduce((sum, row) => sum + row.recordCount, 0);

  return {
    totalQuantity,
    totalRecordCount,
    totalFields: rows.length,
    avgQuantityPerHarvest:
      totalRecordCount > 0 ? totalQuantity / totalRecordCount : 0,
  };
}
