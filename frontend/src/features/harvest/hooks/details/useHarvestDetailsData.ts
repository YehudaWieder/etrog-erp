import { useMemo } from 'react';
import type {
  ClassificationDailySummaryCategory,
  ClassificationDailySummaryRow,
  ClassificationListRecord,
  ClassificationRecord,
} from '../../../../services/classificationsApi';
import type {
  HarvestFieldReportDetailsRecord,
  HarvestRecord,
} from '../../../../services/harvestsApi';
import type { Season } from '../../../../services/seasonsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestI18n } from '../../i18n';
import { buildSortingCategoryDisplayLabel } from '../../utils/harvestPage.utils';
import {
  buildCategoryGradeGroupSplits,
  buildCategoryGradeTotals,
  buildGradeGroupsByCategory,
} from '../../utils/gradeGroupBreakdown.util';
import type { PitamGradeCell } from '../../components/shared/CategoryGradeMatrixTable';
import {
  addToGradeMap,
  buildGroupMatrix,
  normalizePitamKey,
  resolveGrade,
  sortCategoryNames,
  type SortingMatrix,
} from '../../utils/sortingMatrixBuilder.util';

export type NamedSortingMatrix = { name: string; matrix: SortingMatrix };

export type SortingDailyCategorySections = {
  general: SortingMatrix;
  perTrader: NamedSortingMatrix[];
  perCustomer: NamedSortingMatrix[];
};

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
  sortingListRows: ClassificationListRecord[];
  traderCategories: TraderCategoryWithShares[];
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

  const generalHarvestedExcl =
    record.totalHarvested - record.uncalculatedRejected;
  const generalRejectedExcl =
    record.totalRejected - record.uncalculatedRejected;
  const generalRateExcl =
    generalHarvestedExcl > 0
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
    const ownerHarvestedExcl =
      record.ownerHarvested - record.uncalculatedRejected;
    const ownerRejectedExcl =
      record.ownerRejected - record.uncalculatedRejected;
    const ownerRateExcl =
      ownerHarvestedExcl > 0
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
      totalHarvested: numberFormatter.format(
        record.totalHarvested - record.ownerHarvested,
      ),
      totalRejected: numberFormatter.format(
        record.totalRejected - record.ownerRejected,
      ),
      totalAfterRejected: numberFormatter.format(
        record.totalAfterRejected - record.ownerAfterRejected,
      ),
      classifiedTotal: values.none,
      rejectionRate: formatRate(
        toNumericValue(record.rejectionRate) -
          toNumericValue(record.ownerRejectionRate),
      ),
      uncalculatedRejected: numberFormatter.format(
        generalRejectedExcl - ownerRejectedExcl,
      ),
      rejectionRateExcludingBadPicks: formatRate(
        generalRateExcl - ownerRateExcl,
      ),
      harvestExcludingBadPicks: numberFormatter.format(
        generalHarvestedExcl - ownerHarvestedExcl,
      ),
    });
  }

  const isPartialClassification = isPartialClassificationFlag(
    record.isPartialClassification as unknown,
  );
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
  sortingListRows,
  traderCategories,
}: UseHarvestDetailsDataParams) {
  const gradeGroupsByCategory = useMemo(
    () => buildGradeGroupsByCategory(traderCategories),
    [traderCategories],
  );

  const gradeFallback = lang === 'he' ? 'ללא' : 'None';
  const sortingDailyDetailsData = useMemo(() => {
    if (sortingDailyDetailsRowId === null) {
      return null;
    }

    const row = filteredSortingDailyRows.find(
      (item) => item.harvestId === sortingDailyDetailsRowId,
    );
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

    const rowDailyTotal = rowCategories.reduce(
      (sum, category) => sum + category.value,
      0,
    );

    return {
      row,
      rowCategories,
      rowDailyTotal,
    };
  }, [
    filteredSortingDailyRows,
    lang,
    sortingDailyCategories,
    sortingDailyDetailsRowId,
  ]);

  const sortingDailySummaryData = useMemo(() => {
    if (sortingDailyDetailsRowId === null) {
      return null;
    }

    const record = harvestRows.find(
      (row) => row.id === sortingDailyDetailsRowId,
    );
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

  const sortingDailyCategoryBreakdown =
    useMemo((): SortingDailyCategorySections => {
      const totalLabel = t.sortingDailyDetails.table.total;
      const noCategoryLabel = t.sortingSummary.breakdown.noCategory;
      const emptyGeneral: SortingMatrix = {
        rows: [],
        grades: [],
        grandTotalRow: { label: totalLabel, cells: {} },
      };

      if (!sortingDailyDetailsData) {
        return { general: emptyGeneral, perTrader: [], perCustomer: [] };
      }

      const generalCatGrades = new Map<string, Map<string, PitamGradeCell>>();
      const traderCatGrades = new Map<
        string,
        Map<string, Map<string, PitamGradeCell>>
      >();
      const customerCatGrades = new Map<
        string,
        Map<string, Map<string, PitamGradeCell>>
      >();

      for (const row of sortingDailyDetailRows) {
        const quantity = Number(row.quantity) || 0;
        if (quantity <= 0) continue;

        const key = normalizePitamKey(row.pitamStatus);
        const grade = resolveGrade(row, gradeFallback);

        if (row.assignmentType === 'GENERAL') {
          const catName = row.traderCategory?.name?.trim() || '—';
          addToGradeMap(generalCatGrades, catName, grade, key, quantity);
        } else if (row.assignmentType === 'TRADER') {
          const traderName = row.trader?.name?.trim() || noCategoryLabel;
          const catName = row.traderCategory?.name?.trim() || noCategoryLabel;
          if (!traderCatGrades.has(traderName))
            traderCatGrades.set(traderName, new Map());
          addToGradeMap(
            traderCatGrades.get(traderName)!,
            catName,
            grade,
            key,
            quantity,
          );
        } else if (row.assignmentType === 'CUSTOMER') {
          const customerName =
            row.customer?.customerName?.trim() || noCategoryLabel;
          const catName = row.customerCategory?.name?.trim() || noCategoryLabel;
          if (!customerCatGrades.has(customerName))
            customerCatGrades.set(customerName, new Map());
          addToGradeMap(
            customerCatGrades.get(customerName)!,
            catName,
            grade,
            key,
            quantity,
          );
        }
      }

      const general = buildGroupMatrix(
        generalCatGrades,
        gradeFallback,
        totalLabel,
        null,
      );

      const perTrader = sortCategoryNames(
        [...traderCatGrades.keys()],
        null,
      ).map((name) => ({
        name,
        matrix: buildGroupMatrix(
          traderCatGrades.get(name)!,
          gradeFallback,
          totalLabel,
          null,
          noCategoryLabel,
        ),
      }));

      const perCustomer = sortCategoryNames(
        [...customerCatGrades.keys()],
        null,
      ).map((name) => ({
        name,
        matrix: buildGroupMatrix(
          customerCatGrades.get(name)!,
          gradeFallback,
          totalLabel,
          null,
          noCategoryLabel,
        ),
      }));

      return { general, perTrader, perCustomer };
    }, [
      gradeFallback,
      sortingDailyDetailRows,
      sortingDailyDetailsData,
      t.sortingDailyDetails.table.total,
      t.sortingSummary.breakdown.noCategory,
    ]);

  const sortingDailyGradeGroupSplits = useMemo(() => {
    const categoryGradeTotals = buildCategoryGradeTotals(
      sortingDailyDetailRows,
      gradeFallback,
    );
    return buildCategoryGradeGroupSplits(
      categoryGradeTotals,
      gradeGroupsByCategory,
      null,
      t.sortingSummary.gradeGroups.ungrouped,
    );
  }, [
    sortingDailyDetailRows,
    gradeFallback,
    gradeGroupsByCategory,
    t.sortingSummary.gradeGroups.ungrouped,
  ]);

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

    const generalRejectionRateExcl =
      fieldReportDetailsPayload.totalHarvestedExcludingBadPicks > 0
        ? (fieldReportDetailsPayload.totalRejectedExcludingBadPicks /
            fieldReportDetailsPayload.totalHarvestedExcludingBadPicks) *
          100
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
        totalHarvested: numberFormatter.format(
          fieldReportDetailsPayload.totalHarvested,
        ),
        totalRejected: numberFormatter.format(
          fieldReportDetailsPayload.totalRejected,
        ),
        totalAfterRejected: numberFormatter.format(
          fieldReportDetailsPayload.totalAfterRejected,
        ),
        classifiedTotal: numberFormatter.format(
          fieldReportDetailsPayload.classifiedTotal,
        ),
        rejectionRate: formatRate(fieldReportDetailsPayload.rejectionRate),
        uncalculatedRejected: numberFormatter.format(
          fieldReportDetailsPayload.totalRejectedExcludingBadPicks,
        ),
        rejectionRateExcludingBadPicks: formatRate(generalRejectionRateExcl),
        harvestExcludingBadPicks: numberFormatter.format(
          fieldReportDetailsPayload.totalHarvestedExcludingBadPicks,
        ),
      },
    ];

    if (fieldReportDetailsPayload.hasOwnerOverrides) {
      const ownerRejectionRateExcl =
        fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks > 0
          ? (fieldReportDetailsPayload.ownerRejectedExcludingBadPicks /
              fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks) *
            100
          : 0;

      summaryRows.push({
        key: 'owner',
        kind: 'regular' as const,
        label: lang === 'he' ? 'לשיטת פרנקו' : 'Owner method',
        totalHarvested: numberFormatter.format(
          fieldReportDetailsPayload.ownerHarvested,
        ),
        totalRejected: numberFormatter.format(
          fieldReportDetailsPayload.ownerRejected,
        ),
        totalAfterRejected: numberFormatter.format(
          fieldReportDetailsPayload.ownerAfterRejected,
        ),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(fieldReportDetailsPayload.ownerRejectionRate),
        uncalculatedRejected: numberFormatter.format(
          fieldReportDetailsPayload.ownerRejectedExcludingBadPicks,
        ),
        rejectionRateExcludingBadPicks: formatRate(ownerRejectionRateExcl),
        harvestExcludingBadPicks: numberFormatter.format(
          fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks,
        ),
      });

      summaryRows.push({
        key: 'difference',
        kind: 'summary' as const,
        label: lang === 'he' ? 'סה"כ הפרש' : 'Total difference',
        totalHarvested: numberFormatter.format(
          fieldReportDetailsPayload.differenceHarvested,
        ),
        totalRejected: numberFormatter.format(
          fieldReportDetailsPayload.differenceRejected,
        ),
        totalAfterRejected: numberFormatter.format(
          fieldReportDetailsPayload.differenceAfterRejected,
        ),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(
          fieldReportDetailsPayload.differenceRejectionRate,
        ),
        uncalculatedRejected: numberFormatter.format(
          fieldReportDetailsPayload.totalRejectedExcludingBadPicks -
            fieldReportDetailsPayload.ownerRejectedExcludingBadPicks,
        ),
        rejectionRateExcludingBadPicks: formatRate(
          generalRejectionRateExcl - ownerRejectionRateExcl,
        ),
        harvestExcludingBadPicks: numberFormatter.format(
          fieldReportDetailsPayload.totalHarvestedExcludingBadPicks -
            fieldReportDetailsPayload.ownerHarvestedExcludingBadPicks,
        ),
      });
    }

    const fieldGradeTotals = buildCategoryGradeTotals(
      sortingListRows.filter(
        (row) =>
          row.fieldHarvest?.fieldId === fieldReportDetailsPayload.fieldId,
      ),
      gradeFallback,
    );
    const gradeGroupSplits = buildCategoryGradeGroupSplits(
      fieldGradeTotals,
      gradeGroupsByCategory,
      null,
      t.sortingSummary.gradeGroups.ungrouped,
    );

    return {
      fieldName: fieldReportDetailsPayload.fieldName,
      seasonName:
        fieldReportDetailsPayload.seasonName ||
        t.dailyDetails.detailsPanel.values.none,
      recordCount: fieldReportDetailsPayload.recordCount,
      badPickQuantity:
        fieldReportDetailsPayload.totalRejected -
        fieldReportDetailsPayload.totalRejectedExcludingBadPicks,
      summaryStatus,
      summaryRows,
      rows: fieldReportDetailsPayload.rows,
      gradeGroupSplits,
    };
  }, [
    fieldReportDetailsPayload,
    formatRate,
    lang,
    numberFormatter,
    t.dailyDetails.detailsPanel.values.none,
    t.sortingSummary.gradeGroups.ungrouped,
    sortingListRows,
    gradeGroupsByCategory,
    gradeFallback,
  ]);

  const detailsSheetData = useMemo(() => {
    if (!detailsRecord) {
      return null;
    }

    const labels = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;
    const isPartialClassification = isPartialClassificationFlag(
      detailsRecord.isPartialClassification as unknown,
    );
    const seasonName =
      seasons.find((season) => season.id === detailsRecord.seasonId)
        ?.yearName ?? values.none;
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
    const harvestIndexInSeason = seasonRows.findIndex(
      (row) => row.id === detailsRecord.id,
    );
    const harvestNumberDisplay =
      harvestIndexInSeason >= 0
        ? numberFormatter.format(harvestIndexInSeason + 1)
        : values.none;

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
      uncalculatedRejected:
        detailsRecord.totalRejected - detailsRecord.uncalculatedRejected,
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
    sortingDailyGradeGroupSplits,
  };
}
