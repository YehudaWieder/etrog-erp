import type { HarvestFieldReportDetailsPanelLabels } from '../components/field-report/HarvestFieldReportDetailsPanel';
import type { HarvestI18n } from '../i18n';

export function formatHarvestGregorianDate(value: string, lang: 'he' | 'en'): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = lang === 'he' ? 'he-IL' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatHarvestRate(value: number | string, formatter: Intl.NumberFormat): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return `${formatter.format(numeric)}%`;
}

export function isHarvestPartialClassification(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

export function buildHarvestFieldReportDetailsLabels(
  lang: 'he' | 'en',
  t: HarvestI18n,
): HarvestFieldReportDetailsPanelLabels {
  return {
    rowType: lang === 'he' ? 'שורה' : 'Row',
    rowsTitle: lang === 'he' ? 'רשומות' : 'Records',
    season: t.dailyDetails.detailsPanel.fields.season,
    field: t.dailyDetails.detailsPanel.fields.field,
    recordCount: lang === 'he' ? 'מספר קטיפים' : 'Harvest count',
    dateGregorian: t.dailyDetails.columns.dateGregorian,
    dateHebrew: t.dailyDetails.columns.dateHebrew,
    totalHarvested: t.dailyDetails.columns.totalHarvested,
    totalRejected: t.dailyDetails.columns.totalRejected,
    netHarvest: t.dailyDetails.columns.netHarvest,
    classifiedTotal: t.dailyDetails.columns.classifiedTotal,
    rejectionRate: t.dailyDetails.detailsPanel.fields.rejectionRate,
    uncalculatedRejected: t.dailyDetails.columns.uncalculatedRejected,
    rejectionRateExcludingBadPicks: t.fieldReport.headers.rejectionRateExcludingBadPicks,
    harvestExcludingBadPicks: t.fieldReport.headers.harvestExcludingBadPicks,
    notes: t.dailyDetails.detailsPanel.fields.notes,
    none: t.dailyDetails.detailsPanel.values.none,
    emptyRows: t.dailyDetails.empty,
    badPickQuantity: t.dailyDetails.detailsPanel.fields.badPickQuantity,
    gradeGroupsTitle: t.sortingSummary.gradeGroups.title,
    gradeGroupsGroupColumn: t.sortingSummary.gradeGroups.groupColumn,
    gradeGroupsPercentColumn: t.sortingSummary.gradeGroups.percentColumn,
  };
}

