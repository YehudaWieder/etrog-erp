import type { MutableRefObject } from 'react';
import type { ClassificationDailySummaryCategory, ClassificationDailySummaryRow, ClassificationListRecord } from '../../../services/classificationsApi';
import type { HarvestRecord } from '../../../services/harvestsApi';
import type { HarvestI18n } from '../i18n';
import type { HarvestExportTableData, HarvestFieldReportRow, SortingAssignmentFilter } from '../harvestPage.types';
import {
  buildSortingCategoryDisplayLabel,
  getSortingRowOwnerTotals,
  resolveSortingCategoryOwnerType,
} from '../utils/harvestPage.utils';
import { buildSortingDailyExpandedMatrixData } from './harvestSortingExpandedMatrix.service';

type CreateHarvestExportRowBuildersParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  seasonFilterId: number | null;
  sortingAssignmentFilter: SortingAssignmentFilter;
  traderNameById: Map<string, string>;
  customerNameById: Map<string, string>;
  filteredHarvestRows: HarvestRecord[];
  fieldReportRows: HarvestFieldReportRow[];
  filteredSortingDailyCategories: ClassificationDailySummaryCategory[];
  filteredSortingListRows: ClassificationListRecord[];
  visibleHarvestRowsRef: MutableRefObject<HarvestRecord[]>;
  visibleFieldReportRowsRef: MutableRefObject<HarvestFieldReportRow[]>;
  getCurrentSortingDailyExportRows: () => ClassificationDailySummaryRow[];
  formatGregorianDate: (value: string) => string;
};

export function createHarvestExportRowBuilders({
  lang,
  t,
  seasonFilterId,
  sortingAssignmentFilter,
  traderNameById,
  customerNameById,
  filteredHarvestRows,
  fieldReportRows,
  filteredSortingDailyCategories,
  filteredSortingListRows,
  visibleHarvestRowsRef,
  visibleFieldReportRowsRef,
  getCurrentSortingDailyExportRows,
  formatGregorianDate,
}: CreateHarvestExportRowBuildersParams) {
  const createHarvestExportRows = (): HarvestExportTableData => {
    const fields = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;

    const header = [
      t.dailyDetails.columns.fieldName,
      t.dailyDetails.columns.dateGregorian,
      fields.dateHebrew,
      t.dailyDetails.columns.totalHarvested,
      t.dailyDetails.columns.totalRejected,
      fields.totalAfterRejected,
      fields.ownerHarvested,
      fields.ownerRejected,
      fields.ownerAfterRejected,
      t.dailyDetails.columns.classifiedTotal,
      fields.classificationStatus,
      fields.rejectionRate,
      fields.ownerRejectionRate,
      fields.updatedBy,
      fields.notes,
    ];

    const getClassificationStatus = (isPartialClassification: unknown) => {
      const isPartial =
        typeof isPartialClassification === 'boolean'
          ? isPartialClassification
          : Number(isPartialClassification) === 1 || String(isPartialClassification).trim().toLowerCase() === 'true';

      return isPartial ? values.partial : values.final;
    };

    const rowsSource = visibleHarvestRowsRef.current.length > 0 ? visibleHarvestRowsRef.current : filteredHarvestRows;

    const rows = rowsSource.map((row) => [
      row.field?.name ?? values.none,
      formatGregorianDate(row.dateGregorian),
      row.dateHebrew,
      row.totalHarvested,
      row.totalRejected,
      row.totalAfterRejected,
      row.ownerHarvested,
      row.ownerRejected,
      row.ownerAfterRejected,
      row.classifiedTotal,
      getClassificationStatus(row.isPartialClassification),
      row.rejectionRate,
      row.ownerRejectionRate,
      row.updatedBy?.name ?? values.none,
      row.notes ?? values.none,
    ]);

    return { header, rows };
  };

  const createFieldReportExportRows = (): HarvestExportTableData => {
    const fields = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;
    const franco = t.fieldReport.francoColumns;

    const header = [
      t.dailyDetails.columns.fieldName,
      t.fieldReport.headers.recordCount,
      t.fieldReport.headers.badPickCount,
      t.dailyDetails.columns.totalHarvested,
      t.dailyDetails.columns.totalRejected,
      t.dailyDetails.columns.netHarvest,
      t.dailyDetails.columns.classifiedTotal,
      fields.rejectionRate,
      franco.harvested,
      franco.rejected,
      franco.net,
      franco.rejectionRate,
      values.differenceRow,
      t.fieldReport.headers.differenceRejected,
      t.fieldReport.headers.differenceNet,
      t.fieldReport.headers.differenceRate,
      fields.classificationStatus,
    ];

    const rowsSource = visibleFieldReportRowsRef.current.length > 0 ? visibleFieldReportRowsRef.current : fieldReportRows;

    const rows = rowsSource.map((row) => [
      row.fieldName,
      row.recordCount,
      row.badPickCount,
      row.totalHarvested,
      row.totalRejected,
      row.totalAfterRejected,
      row.classifiedTotal,
      row.rejectionRate,
      row.ownerHarvested,
      row.ownerRejected,
      row.ownerAfterRejected,
      row.ownerRejectionRate,
      row.differenceHarvested,
      row.differenceRejected,
      row.differenceAfterRejected,
      row.differenceRejectionRate,
      row.isPartialClassification ? values.partial : values.final,
    ]);

    return { header, rows };
  };

  const createSortingDailyExportRows = (): HarvestExportTableData => {
    const rowsSource = getCurrentSortingDailyExportRows();
    const visibleSortingDailyCategories = filteredSortingDailyCategories.filter(
      (category) => resolveSortingCategoryOwnerType(category) === 'GENERAL',
    );

    const exportCategories = visibleSortingDailyCategories
      .filter((category) => rowsSource.some((row) => (row.categoryTotals[category.key] ?? 0) > 0))
      .map((category) => ({
        key: category.key,
        label: buildSortingCategoryDisplayLabel(category, lang),
      }));

    const header = [
      t.sortingDailyDetails.columns.dateGregorian,
      t.sortingDailyDetails.columns.dateHebrew,
      t.sortingDailyDetails.columns.fieldName,
      ...exportCategories.map((category) => category.label),
      t.sortingDailyDetails.columns.traderTotal,
      t.sortingDailyDetails.columns.customerTotal,
      t.sortingDailyDetails.columns.totalSorted,
    ];

    const rows = rowsSource.map((row) => {
      const categoryValues = exportCategories.map((category) => row.categoryTotals[category.key] ?? 0);
      const { traderTotal, customerTotal } = getSortingRowOwnerTotals(row, filteredSortingDailyCategories);
      const rowDailyTotal = filteredSortingDailyCategories.reduce(
        (sum, category) => sum + (row.categoryTotals[category.key] ?? 0),
        0,
      );

      return [
        formatGregorianDate(row.dateGregorian),
        row.dateHebrew,
        row.fieldName,
        ...categoryValues,
        traderTotal,
        customerTotal,
        rowDailyTotal,
      ];
    });

    return { header, rows };
  };

  const createSortingDailyExpandedMatrixData = async () => {
    return buildSortingDailyExpandedMatrixData({
      lang,
      t: t.sortingDailyDetails.pitamLabels,
      seasonFilterId,
      sortingAssignmentFilter,
      filteredSortingDailyCategories,
      visibleCategoryOwnerTypes: ['GENERAL'],
      rowsSource: getCurrentSortingDailyExportRows(),
      traderNameById,
      customerNameById,
      formatGregorianDate,
      fixedHeaders: {
        dateGregorian: t.sortingDailyDetails.columns.dateGregorian,
        dateHebrew: t.sortingDailyDetails.columns.dateHebrew,
        fieldName: t.sortingDailyDetails.columns.fieldName,
      },
      noneLabel: t.dailyDetails.detailsPanel.values.none,
    });
  };

  const createSortingListExportRows = (): HarvestExportTableData => {
    const sl = t.sortingList;

    const resolveTarget = (row: ClassificationListRecord): string => {
      if (row.assignmentType === 'TRADER') return row.trader?.name ?? '-';
      if (row.assignmentType === 'CUSTOMER') return row.customer?.customerName ?? '-';
      return sl.assignmentTypes.general;
    };

    const resolveCategory = (row: ClassificationListRecord): string => {
      return row.customerCategory?.name ?? row.traderCategory?.name ?? '-';
    };

    const resolveGrade = (row: ClassificationListRecord): string => {
      return row.grade ?? row.customerCategory?.grade ?? '-';
    };

    const resolveAssignmentLabel = (type: string): string => {
      if (type === 'TRADER') return sl.assignmentTypes.trader;
      if (type === 'CUSTOMER') return sl.assignmentTypes.customer;
      return sl.assignmentTypes.general;
    };

    const resolvePitamLabel = (status?: string | null): string => {
      if (status === 'WITH_PITAM') return sl.pitamLabels.withPitam;
      if (status === 'WITHOUT_PITAM') return sl.pitamLabels.withoutPitam;
      if (status === 'MIXED') return sl.pitamLabels.mixed;
      return '-';
    };

    const header = [
      sl.columns.dateGregorian,
      sl.columns.dateHebrew,
      sl.columns.fieldName,
      sl.columns.assignmentType,
      sl.columns.target,
      sl.columns.category,
      sl.columns.grade,
      sl.columns.pitamStatus,
      sl.columns.quantity,
      sl.columns.notes,
    ];

    const rows = filteredSortingListRows.map((row) => [
      formatGregorianDate(row.fieldHarvest?.dateGregorian ?? ''),
      row.fieldHarvest?.dateHebrew ?? '-',
      row.fieldHarvest?.field?.name ?? '-',
      resolveAssignmentLabel(row.assignmentType),
      resolveTarget(row),
      resolveCategory(row),
      resolveGrade(row),
      resolvePitamLabel(row.pitamStatus),
      row.quantity,
      row.notes ?? '-',
    ]);

    return { header, rows };
  };

  return {
    createHarvestExportRows,
    createFieldReportExportRows,
    createSortingDailyExportRows,
    createSortingDailyExpandedMatrixData,
    createSortingListExportRows,
  };
}
