import { useMemo } from 'react';
import type {
  ClassificationDailySummaryCategory,
  ClassificationDailySummaryRow,
  ClassificationRecord,
} from '../../../../services/classificationsApi';
import type { HarvestFieldReportDetailsRecord, HarvestRecord } from '../../../../services/harvestsApi';
import type { Season } from '../../../../services/seasonsApi';
import type { HarvestI18n } from '../../i18n';
import { buildSortingCategoryDisplayLabel } from '../../utils/harvestPage.utils';

type UseHarvestDetailsDataParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  filteredSortingDailyRows: ClassificationDailySummaryRow[];
  sortingDailyCategories: ClassificationDailySummaryCategory[];
  sortingDailyDetailsRowId: number | null;
  sortingDailyDetailRows: ClassificationRecord[];
  fieldReportDetailsPayload: HarvestFieldReportDetailsRecord | null;
  detailsRecord: HarvestRecord | null;
  seasons: Season[];
  harvestRows: HarvestRecord[];
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
  formatRate: (value: number | string) => string;
  isPartialClassificationFlag: (value: unknown) => boolean;
};

type RecordSummaryRow = {
  key: string;
  kind: 'regular' | 'summary';
  label: string;
  totalHarvested: string;
  totalRejected: string;
  totalAfterRejected: string;
  classifiedTotal: string;
  rejectionRate: string;
  uncalculatedRejected: string;
  rejectionRateExcludingBadPicks: string;
  harvestExcludingBadPicks: string;
};

function buildRecordSummary(
  record: HarvestRecord,
  values: HarvestI18n['dailyDetails']['detailsPanel']['values'],
  numberFormatter: Intl.NumberFormat,
  formatRate: (value: number | string) => string,
  isPartialClassificationFlag: (value: unknown) => boolean,
): { statusLabel: string; rows: RecordSummaryRow[] } {
  const hasOwnerRowData =
    record.ownerHarvested > 0 ||
    record.ownerRejected > 0 ||
    record.ownerAfterRejected > 0 ||
    Number(record.ownerRejectionRate) > 0;

  const toNumericValue = (value: number | string) => {
    const numeric = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const generalHarvestedExcl = record.totalHarvested - record.uncalculatedRejected;
  const generalRejectedExcl = record.totalRejected - record.uncalculatedRejected;
  const generalRateExcl = generalHarvestedExcl > 0
    ? (generalRejectedExcl / generalHarvestedExcl) * 100
    : 0;

  const rows: RecordSummaryRow[] = [
    {
      key: 'general',
      kind: 'regular',
      label: values.generalRow,
      totalHarvested: numberFormatter.format(record.totalHarvested),
      totalRejected: numberFormatter.format(record.totalRejected),
      totalAfterRejected: numberFormatter.format(record.totalAfterRejected),
      classifiedTotal: numberFormatter.format(record.classifiedTotal),
      rejectionRate: formatRate(record.rejectionRate),
      uncalculatedRejected: numberFormatter.format(generalRejectedExcl),
      rejectionRateExcludingBadPicks: formatRate(generalRateExcl),
      harvestExcludingBadPicks: numberFormatter.format(generalHarvestedExcl),
    },
  ];

  if (hasOwnerRowData) {
    const ownerHarvestedExcl = record.ownerHarvested - record.uncalculatedRejected;
    const ownerRejectedExcl = record.ownerRejected - record.uncalculatedRejected;
    const ownerRateExcl = ownerHarvestedExcl > 0
      ? (ownerRejectedExcl / ownerHarvestedExcl) * 100
      : 0;

    rows.push({
      key: 'owner',
      kind: 'regular',
      label: values.ownerRow,
      totalHarvested: numberFormatter.format(record.ownerHarvested),
      totalRejected: numberFormatter.format(record.ownerRejected),
      totalAfterRejected: numberFormatter.format(record.ownerAfterRejected),
      classifiedTotal: values.none,
      rejectionRate: formatRate(record.ownerRejectionRate),
      uncalculatedRejected: numberFormatter.format(ownerRejectedExcl),
      rejectionRateExcludingBadPicks: formatRate(ownerRateExcl),
      harvestExcludingBadPicks: numberFormatter.format(ownerHarvestedExcl),
    });

    rows.push({
      key: 'difference',
      kind: 'summary',
      label: values.differenceRow,
      totalHarvested: numberFormatter.format(record.totalHarvested - record.ownerHarvested),
      totalRejected: numberFormatter.format(record.totalRejected - record.ownerRejected),
      totalAfterRejected: numberFormatter.format(record.totalAfterRejected - record.ownerAfterRejected),
      classifiedTotal: values.none,
      rejectionRate: formatRate(toNumericValue(record.rejectionRate) - toNumericValue(record.ownerRejectionRate)),
      uncalculatedRejected: numberFormatter.format(generalRejectedExcl - ownerRejectedExcl),
      rejectionRateExcludingBadPicks: formatRate(generalRateExcl - ownerRateExcl),
      harvestExcludingBadPicks: numberFormatter.format(generalHarvestedExcl - ownerHarvestedExcl),
    });
  }

  const isPartialClassification = isPartialClassificationFlag(record.isPartialClassification as unknown);
  const statusLabel = `${values.statusPrefix} ${isPartialClassification ? values.partial : values.final}`;

  return { statusLabel, rows };
}

export function useHarvestDetailsData({
  lang,
  t,
  filteredSortingDailyRows,
  sortingDailyCategories,
  sortingDailyDetailsRowId,
  sortingDailyDetailRows,
  fieldReportDetailsPayload,
  detailsRecord,
  seasons,
  harvestRows,
  formatGregorianDate,
  numberFormatter,
  formatRate,
  isPartialClassificationFlag,
}: UseHarvestDetailsDataParams) {
  const sortingDailyDetailsData = useMemo(() => {
    if (sortingDailyDetailsRowId === null) {
      return null;
    }

    const row = filteredSortingDailyRows.find((item) => item.harvestId === sortingDailyDetailsRowId);
    if (!row) {
      return null;
    }

    const rowCategories = sortingDailyCategories
      .map((category) => ({
        key: category.key,
        label: buildSortingCategoryDisplayLabel(category, lang),
        value: row.categoryTotals[category.key] ?? 0,
      }))
      .filter((category) => category.value > 0);

    const rowDailyTotal = rowCategories.reduce((sum, category) => sum + category.value, 0);

    return {
      row,
      rowCategories,
      rowDailyTotal,
    };
  }, [filteredSortingDailyRows, lang, sortingDailyCategories, sortingDailyDetailsRowId]);

  const sortingDailySummaryData = useMemo(() => {
    if (sortingDailyDetailsRowId === null) {
      return null;
    }

    const record = harvestRows.find((row) => row.id === sortingDailyDetailsRowId);
    if (!record) {
      return null;
    }

    return buildRecordSummary(
      record,
      t.dailyDetails.detailsPanel.values,
      numberFormatter,
      formatRate,
      isPartialClassificationFlag,
    );
  }, [
    formatRate,
    harvestRows,
    isPartialClassificationFlag,
    numberFormatter,
    sortingDailyDetailsRowId,
    t.dailyDetails.detailsPanel.values,
  ]);

  const sortingDailyCategoryBreakdown = useMemo(() => {
    if (!sortingDailyDetailsData) {
      return [] as Array<{
        label: string;
        total: number;
        pitamHeaders: Array<{ key: string; label: string; total: number }>;
        gradeRows: Array<{ grade: string; values: Record<string, number>; total: number }>;
      }>;
    }

    const pitamLabelMap: Record<string, string> = {
      WITH_PITAM: lang === 'he' ? 'פיטם' : 'With pitam',
      WITHOUT_PITAM: lang === 'he' ? 'בל"פ' : 'Without pitam',
      MIXED: lang === 'he' ? 'מעורב' : 'Mixed',
      UNKNOWN: lang === 'he' ? 'לא ידוע' : 'Unknown',
    };

    const getPitamKey = (value?: string | null) => {
      if (!value) {
        return 'UNKNOWN';
      }

      const normalized = value.replace(/\s+/g, '_').toUpperCase();
      if (normalized === 'WITH_PITAM' || normalized === 'WITHOUT_PITAM') {
        return normalized;
      }

      return 'MIXED';
    };

    const getCategoryDisplayLabel = (row: ClassificationRecord) => {
      const categoryName = row.customerCategory?.name ?? row.traderCategory?.name ?? '';
      if (!categoryName) {
        return '';
      }

      if (row.assignmentType === 'TRADER') {
        const ownerName = row.trader?.name?.trim();
        return ownerName ? `${ownerName} | ${categoryName}` : categoryName;
      }

      if (row.assignmentType === 'CUSTOMER') {
        const ownerName = row.customer?.customerName?.trim();
        return ownerName ? `${ownerName} | ${categoryName}` : categoryName;
      }

      return categoryName;
    };

    const categoryOrder = sortingDailyDetailsData.rowCategories.map((category) => category.label);
    const allowedCategories = new Set(categoryOrder);

    const grouped = new Map<
      string,
      {
        total: number;
        pitamTotals: Record<string, number>;
        grades: Map<string, Record<string, number>>;
      }
    >();

    for (const row of sortingDailyDetailRows) {
      const quantity = Number(row.quantity) || 0;
      if (quantity <= 0) {
        continue;
      }

      const categoryLabel = getCategoryDisplayLabel(row);
      if (!categoryLabel || !allowedCategories.has(categoryLabel)) {
        continue;
      }

      const grade = row.grade || row.customerCategory?.grade || '-';
      const pitamKey = getPitamKey(row.pitamStatus);

      if (!grouped.has(categoryLabel)) {
        grouped.set(categoryLabel, {
          total: 0,
          pitamTotals: {},
          grades: new Map<string, Record<string, number>>(),
        });
      }

      const categoryGroup = grouped.get(categoryLabel)!;
      categoryGroup.total += quantity;
      categoryGroup.pitamTotals[pitamKey] = (categoryGroup.pitamTotals[pitamKey] ?? 0) + quantity;

      if (!categoryGroup.grades.has(grade)) {
        categoryGroup.grades.set(grade, {});
      }

      const gradeValues = categoryGroup.grades.get(grade)!;
      gradeValues[pitamKey] = (gradeValues[pitamKey] ?? 0) + quantity;
    }

    return categoryOrder
      .filter((label) => grouped.has(label))
      .map((label) => {
        const group = grouped.get(label)!;
        const pitamKeys = Object.keys(group.pitamTotals).sort((left, right) => {
          const order = ['WITHOUT_PITAM', 'WITH_PITAM', 'MIXED', 'UNKNOWN'];
          return order.indexOf(left) - order.indexOf(right);
        });

        const pitamHeaders = pitamKeys.map((key) => ({
          key,
          label: pitamLabelMap[key] ?? key,
          total: group.pitamTotals[key] ?? 0,
        }));

        const gradeRows = Array.from(group.grades.entries())
          .map(([grade, values]) => ({
            grade,
            values,
            total: pitamKeys.reduce((sum, key) => sum + (values[key] ?? 0), 0),
          }))
          .sort((a, b) =>
            a.grade.localeCompare(b.grade, lang === 'he' ? 'he' : 'en', { sensitivity: 'base', numeric: true }),
          );

        return {
          label,
          total: group.total,
          pitamHeaders,
          gradeRows,
        };
      });
  }, [lang, sortingDailyDetailRows, sortingDailyDetailsData]);

  const fieldReportDetailsData = useMemo(() => {
    if (!fieldReportDetailsPayload) {
      return null;
    }

    const summaryStatus = !fieldReportDetailsPayload.isPartialClassification
      ? lang === 'he'
        ? 'מיון סופי'
        : 'Final sorting'
      : lang === 'he'
        ? 'מיון חלקי'
        : 'Partial sorting';

    const generalRejectionRateExcl = fieldReportDetailsPayload.totalHarvestedExcludingBadPicks > 0
      ? (fieldReportDetailsPayload.totalRejectedExcludingBadPicks / fieldReportDetailsPayload.totalHarvestedExcludingBadPicks) * 100
      : 0;

    const summaryRows: Array<{
      key: string;
      kind: 'regular' | 'summary';
      label: string;
      totalHarvested: string;
      totalRejected: string;
      totalAfterRejected: string;
      classifiedTotal: string;
      rejectionRate: string;
      uncalculatedRejected: string;
      rejectionRateExcludingBadPicks: string;
      harvestExcludingBadPicks: string;
    }> = [
      {
        key: 'general',
        kind: 'regular' as const,
        label: lang === 'he' ? 'לשיטתנו' : 'Our method',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.totalHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.totalRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.totalAfterRejected),
        classifiedTotal: numberFormatter.format(fieldReportDetailsPayload.classifiedTotal),
        rejectionRate: formatRate(fieldReportDetailsPayload.rejectionRate),
        uncalculatedRejected: numberFormatter.format(fieldReportDetailsPayload.totalRejectedExcludingBadPicks),
        rejectionRateExcludingBadPicks: formatRate(generalRejectionRateExcl),
        harvestExcludingBadPicks: numberFormatter.format(fieldReportDetailsPayload.totalHarvestedExcludingBadPicks),
      },
    ];

    if (fieldReportDetailsPayload.hasOwnerOverrides) {
      const ownerRejectionRateExcl = fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks > 0
        ? (fieldReportDetailsPayload.ownerRejectedExcludingBadPicks / fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks) * 100
        : 0;

      summaryRows.push({
        key: 'owner',
        kind: 'regular' as const,
        label: lang === 'he' ? 'לשיטת פרנקו' : 'Owner method',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.ownerHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.ownerRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.ownerAfterRejected),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(fieldReportDetailsPayload.ownerRejectionRate),
        uncalculatedRejected: numberFormatter.format(fieldReportDetailsPayload.ownerRejectedExcludingBadPicks),
        rejectionRateExcludingBadPicks: formatRate(ownerRejectionRateExcl),
        harvestExcludingBadPicks: numberFormatter.format(fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks),
      });

      summaryRows.push({
        key: 'difference',
        kind: 'summary' as const,
        label: lang === 'he' ? 'סה"כ הפרש' : 'Total difference',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.differenceHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.differenceRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.differenceAfterRejected),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(fieldReportDetailsPayload.differenceRejectionRate),
        uncalculatedRejected: numberFormatter.format(
          fieldReportDetailsPayload.totalRejectedExcludingBadPicks - fieldReportDetailsPayload.ownerRejectedExcludingBadPicks,
        ),
        rejectionRateExcludingBadPicks: formatRate(generalRejectionRateExcl - ownerRejectionRateExcl),
        harvestExcludingBadPicks: numberFormatter.format(
          fieldReportDetailsPayload.totalHarvestedExcludingBadPicks - fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks,
        ),
      });
    }

    return {
      fieldName: fieldReportDetailsPayload.fieldName,
      seasonName: fieldReportDetailsPayload.seasonName || t.dailyDetails.detailsPanel.values.none,
      recordCount: fieldReportDetailsPayload.recordCount,
      badPickQuantity: fieldReportDetailsPayload.totalRejected - fieldReportDetailsPayload.totalRejectedExcludingBadPicks,
      summaryStatus,
      summaryRows,
      rows: fieldReportDetailsPayload.rows,
    };
  }, [fieldReportDetailsPayload, formatRate, lang, numberFormatter, t.dailyDetails.detailsPanel.values.none]);

  const detailsSheetData = useMemo(() => {
    if (!detailsRecord) {
      return null;
    }

    const labels = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;
    const isPartialClassification = isPartialClassificationFlag(detailsRecord.isPartialClassification as unknown);
    const seasonName = seasons.find((season) => season.id === detailsRecord.seasonId)?.yearName ?? values.none;
    const seasonRows = harvestRows
      .filter((row) => row.seasonId === detailsRecord.seasonId)
      .sort((a, b) => {
        const aTime = Date.parse(a.dateGregorian);
        const bTime = Date.parse(b.dateGregorian);

        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return aTime - bTime;
        }

        return a.id - b.id;
      });
    const harvestIndexInSeason = seasonRows.findIndex((row) => row.id === detailsRecord.id);
    const harvestNumberDisplay = harvestIndexInSeason >= 0 ? numberFormatter.format(harvestIndexInSeason + 1) : values.none;

    const { rows: summaryRows } = buildRecordSummary(
      detailsRecord,
      values,
      numberFormatter,
      formatRate,
      isPartialClassificationFlag,
    );

    return {
      dateGregorian: formatGregorianDate(detailsRecord.dateGregorian),
      dateHebrew: detailsRecord.dateHebrew || values.none,
      seasonName,
      harvestNumber: harvestNumberDisplay,
      fieldName: detailsRecord.field?.name ?? values.none,
      updatedByName: detailsRecord.updatedBy?.name ?? values.none,
      uncalculatedRejected: detailsRecord.totalRejected - detailsRecord.uncalculatedRejected,
      badPickQuantity: detailsRecord.uncalculatedRejected,
      statusLabel: `${values.statusPrefix} ${isPartialClassification ? values.partial : values.final}`,
      notes: detailsRecord.notes?.trim() || '',
      rows: summaryRows,
      labels,
      values,
    };
  }, [
    detailsRecord,
    formatGregorianDate,
    isPartialClassificationFlag,
    harvestRows,
    lang,
    numberFormatter,
    seasons,
    t.dailyDetails.detailsPanel.fields,
    t.dailyDetails.detailsPanel.values,
    formatRate,
  ]);

  return {
    detailsSheetData,
    fieldReportDetailsData,
    sortingDailyCategoryBreakdown,
    sortingDailyDetailsData,
    sortingDailySummaryData,
  };
}



