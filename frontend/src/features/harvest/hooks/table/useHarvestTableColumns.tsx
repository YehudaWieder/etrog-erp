import { useMemo } from 'react';
import {
  GLOBAL_DATA_TABLE_WIDTHS,
  type GlobalDataTableColumn,
} from '../../../../components/ui/GlobalDataTable';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import type { ClassificationDailySummaryCategory, ClassificationDailySummaryRow } from '../../../../services/classificationsApi';
import type { HarvestI18n } from '../../i18n';
import type { HarvestFieldReportRow } from '../../harvestPage.types';
import {
  buildSortingCategoryDisplayLabel,
  getSortingRowOwnerTotals,
  resolveSortingCategoryOwnerType,
} from '../../utils/harvestPage.utils';
import { HarvestDetailsTriggerButton } from '../../components/shared/HarvestDetailsTriggerButton';
import interactiveStyles from '../../components/styles/HarvestInteractive.module.css';

type UseHarvestTableColumnsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
  formatRate: (value: number | string) => string;
  sortingDailyCategories: ClassificationDailySummaryCategory[];
  fieldReportMethod: 'our' | 'franco';
  setDetailsRecord: (value: HarvestRecord | null) => void;
  setFieldReportDetailsFieldId: (value: number | null) => void;
  setSortingDailyDetailsRowId: (value: number | null) => void;
  isPartialClassificationFlag: (value: unknown) => boolean;
};

export function useHarvestTableColumns({
  lang,
  t,
  formatGregorianDate,
  numberFormatter,
  formatRate,
  sortingDailyCategories,
  fieldReportMethod,
  setDetailsRecord,
  setFieldReportDetailsFieldId,
  setSortingDailyDetailsRowId,
  isPartialClassificationFlag,
}: UseHarvestTableColumnsParams) {
  const columns = useMemo<GlobalDataTableColumn<HarvestRecord>[]>(() => {
    return [
      {
        id: 'actions',
        header: t.tableLabels.details,
        headerLabel: t.tableLabels.details,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={t.dailyDetails.detailsPanel.openDetails}
            onClick={() => setDetailsRecord(row)}
          />
        ),
      },
      {
        id: 'dateGregorian',
        header: t.dailyDetails.columns.dateGregorian,
        headerLabel: t.dailyDetails.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortLabel: `${t.dailyDetails.columns.dateGregorian} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => Date.parse(row.dateGregorian),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        render: (row) => formatGregorianDate(row.dateGregorian),
      },
      {
        id: 'dateHebrew',
        header: t.dailyDetails.columns.dateHebrew,
        headerLabel: t.dailyDetails.columns.dateHebrew,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        render: (row) => row.dateHebrew,
      },
      {
        id: 'fieldName',
        header: t.dailyDetails.columns.fieldName,
        headerLabel: t.dailyDetails.columns.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.field?.name ?? '-',
      },
      {
        id: 'totalHarvested',
        header: t.dailyDetails.columns.totalHarvested,
        headerLabel: t.dailyDetails.columns.totalHarvested,
        sortKey: 'totalHarvested',
        sortLabel: `${t.dailyDetails.columns.totalHarvested} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalHarvested,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => numberFormatter.format(row.totalHarvested),
      },
      {
        id: 'totalRejected',
        header: t.dailyDetails.columns.totalRejected,
        headerLabel: t.dailyDetails.columns.totalRejected,
        sortKey: 'totalRejected',
        sortLabel: `${t.dailyDetails.columns.totalRejected} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => numberFormatter.format(row.totalRejected),
      },
      {
        id: 'totalAfterRejected',
        header: t.dailyDetails.columns.netHarvest,
        headerLabel: t.dailyDetails.columns.netHarvest,
        sortKey: 'totalAfterRejected',
        sortLabel: `${t.dailyDetails.columns.netHarvest} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalAfterRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
        align: 'center',
        render: (row) => numberFormatter.format(row.totalAfterRejected),
      },
      {
        id: 'classifiedTotal',
        header: t.dailyDetails.columns.classifiedTotal,
        headerLabel: t.dailyDetails.columns.classifiedTotal,
        sortKey: 'classifiedTotal',
        sortLabel: `${t.dailyDetails.columns.classifiedTotal} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.classifiedTotal,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
        align: 'center',
        render: (row) => (
          <span
            className={`${interactiveStyles.classifiedTotal}${isPartialClassificationFlag(row.isPartialClassification as unknown) ? ` ${interactiveStyles.classifiedTotalPartial}` : ''}`}
          >
            {row.classifiedTotal}
          </span>
        ),
      },
    ];
  }, [formatGregorianDate, isPartialClassificationFlag, lang, numberFormatter, setDetailsRecord, t]);

  const fieldReportColumns = useMemo<GlobalDataTableColumn<HarvestFieldReportRow>[]>(() => {
    return [
      {
        id: 'details',
        header: t.tableLabels.details,
        headerLabel: t.tableLabels.details,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={t.tableLabels.viewAllFieldDetails(row.fieldName)}
            onClick={() => setFieldReportDetailsFieldId(row.id)}
          />
        ),
      },
      {
        id: 'fieldName',
        header: t.dailyDetails.columns.fieldName,
        headerLabel: t.dailyDetails.columns.fieldName,
        sortKey: 'fieldName',
        sortLabel: `${t.dailyDetails.columns.fieldName} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'asc',
        sortAccessor: (row) => row.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.fieldName,
      },
      {
        id: 'recordCount',
        header: t.fieldReport.headers.recordCount,
        headerLabel: t.fieldReport.headers.recordCount,
        sortKey: 'recordCount',
        sortLabel: `${t.fieldReport.headers.recordCount} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.recordCount,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => numberFormatter.format(row.recordCount),
      },
      ...(fieldReportMethod === 'franco'
        ? [
            {
              id: 'ownerHarvested',
              header: t.fieldReport.francoColumns.harvested,
              headerLabel: t.fieldReport.francoColumns.harvested,
              sortKey: 'ownerHarvested',
              sortLabel: `${t.fieldReport.francoColumns.harvested} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.ownerHarvested,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.ownerHarvested),
            },
            {
              id: 'ownerRejected',
              header: t.fieldReport.francoColumns.rejected,
              headerLabel: t.fieldReport.francoColumns.rejected,
              sortKey: 'ownerRejected',
              sortLabel: `${t.fieldReport.francoColumns.rejected} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.ownerRejected,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.ownerRejected),
            },
            {
              id: 'ownerAfterRejected',
              header: t.fieldReport.francoColumns.net,
              headerLabel: t.fieldReport.francoColumns.net,
              sortKey: 'ownerAfterRejected',
              sortLabel: `${t.fieldReport.francoColumns.net} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.ownerAfterRejected,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.ownerAfterRejected),
            },
            {
              id: 'ownerRejectionRate',
              header: t.fieldReport.francoColumns.rejectionRate,
              headerLabel: t.fieldReport.francoColumns.rejectionRate,
              sortKey: 'ownerRejectionRate',
              sortLabel: `${t.fieldReport.francoColumns.rejectionRate} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.ownerRejectionRate,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericPercent,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => formatRate(row.ownerRejectionRate),
            },
          ]
        : [
            {
              id: 'totalHarvested',
              header: t.dailyDetails.columns.totalHarvested,
              headerLabel: t.dailyDetails.columns.totalHarvested,
              sortKey: 'totalHarvested',
              sortLabel: `${t.dailyDetails.columns.totalHarvested} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.totalHarvested,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.totalHarvested),
            },
            {
              id: 'totalRejected',
              header: t.dailyDetails.columns.totalRejected,
              headerLabel: t.dailyDetails.columns.totalRejected,
              sortKey: 'totalRejected',
              sortLabel: `${t.dailyDetails.columns.totalRejected} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.totalRejected,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.totalRejected),
            },
            {
              id: 'totalAfterRejected',
              header: t.dailyDetails.columns.netHarvest,
              headerLabel: t.dailyDetails.columns.netHarvest,
              sortKey: 'totalAfterRejected',
              sortLabel: `${t.dailyDetails.columns.netHarvest} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.totalAfterRejected,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => numberFormatter.format(row.totalAfterRejected),
            },
            {
              id: 'rejectionRate',
              header: t.dailyDetails.detailsPanel.fields.rejectionRate,
              headerLabel: t.dailyDetails.detailsPanel.fields.rejectionRate,
              sortKey: 'rejectionRate',
              sortLabel: `${t.dailyDetails.detailsPanel.fields.rejectionRate} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: HarvestFieldReportRow) => row.rejectionRate,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericPercent,
              align: 'center' as const,
              render: (row: HarvestFieldReportRow) => formatRate(row.rejectionRate),
            },
          ]),
    ];
  }, [
    fieldReportMethod,
    formatRate,
    lang,
    numberFormatter,
    setFieldReportDetailsFieldId,
    t.dailyDetails.columns,
    t.dailyDetails.detailsPanel.fields,
    t.fieldReport.francoColumns,
    t.fieldReport.headers,
  ]);

  const sortingDailyColumns = useMemo<GlobalDataTableColumn<ClassificationDailySummaryRow>[]>(() => {
    const visibleSortingDailyCategories = sortingDailyCategories.filter(
      (category) => resolveSortingCategoryOwnerType(category) === 'GENERAL',
    );

    const categoryColumns: GlobalDataTableColumn<ClassificationDailySummaryRow>[] = visibleSortingDailyCategories
      .map((category) => {
        const categoryLabel = buildSortingCategoryDisplayLabel(category, lang);

        return {
          id: `category-${category.key}`,
          header: categoryLabel,
          headerLabel: categoryLabel,
          sortKey: `sortingCategory:${category.key}`,
          sortLabel: `${categoryLabel} - ${t.tableLabels.sort}`,
          defaultSortDirection: 'desc',
          sortAccessor: (row) => row.categoryTotals[category.key] ?? 0,
          minWidth: '150px',
          gridTemplate: 'minmax(150px, 1fr)',
          align: 'center',
          render: (row) => numberFormatter.format(row.categoryTotals[category.key] ?? 0),
        };
      });

    const hasTraderSummary = sortingDailyCategories.some((category) => resolveSortingCategoryOwnerType(category) === 'TRADER');
    const hasCustomerSummary = sortingDailyCategories.some((category) => resolveSortingCategoryOwnerType(category) === 'CUSTOMER');

    const summaryColumns: GlobalDataTableColumn<ClassificationDailySummaryRow>[] = [
      ...(hasTraderSummary
        ? [
            {
              id: 'ownerSummary:trader',
              header: t.sortingDailyDetails.columns.traderTotal,
              headerLabel: t.sortingDailyDetails.columns.traderTotal,
              sortKey: 'ownerSummary:trader',
              sortLabel: `${t.sortingDailyDetails.columns.traderTotal} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: ClassificationDailySummaryRow) => getSortingRowOwnerTotals(row, sortingDailyCategories).traderTotal,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              align: 'center' as const,
              render: (row: ClassificationDailySummaryRow) => {
                const traderTotal = getSortingRowOwnerTotals(row, sortingDailyCategories).traderTotal;
                return <strong>{numberFormatter.format(traderTotal)}</strong>;
              },
            },
          ]
        : []),
      ...(hasCustomerSummary
        ? [
            {
              id: 'ownerSummary:customer',
              header: t.sortingDailyDetails.columns.customerTotal,
              headerLabel: t.sortingDailyDetails.columns.customerTotal,
              sortKey: 'ownerSummary:customer',
              sortLabel: `${t.sortingDailyDetails.columns.customerTotal} - ${t.tableLabels.sort}`,
              defaultSortDirection: 'desc' as const,
              sortAccessor: (row: ClassificationDailySummaryRow) => getSortingRowOwnerTotals(row, sortingDailyCategories).customerTotal,
              minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
              align: 'center' as const,
              render: (row: ClassificationDailySummaryRow) => {
                const customerTotal = getSortingRowOwnerTotals(row, sortingDailyCategories).customerTotal;
                return <strong>{numberFormatter.format(customerTotal)}</strong>;
              },
            },
          ]
        : []),
    ];

    return [
      {
        id: 'details',
        header: t.tableLabels.details,
        headerLabel: t.tableLabels.details,
        minWidth: '72px',
        gridTemplate: '72px',
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={t.tableLabels.showSortingRowDetails}
            onClick={() => setSortingDailyDetailsRowId(row.harvestId)}
          />
        ),
      },
      {
        id: 'dateGregorian',
        header: t.sortingDailyDetails.columns.dateGregorian,
        headerLabel: t.sortingDailyDetails.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortLabel: `${t.sortingDailyDetails.columns.dateGregorian} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => Date.parse(row.dateGregorian),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        render: (row) => formatGregorianDate(row.dateGregorian),
      },
      {
        id: 'dateHebrew',
        header: t.sortingDailyDetails.columns.dateHebrew,
        headerLabel: t.sortingDailyDetails.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortLabel: `${t.sortingDailyDetails.columns.dateHebrew} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.dateHebrew,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        render: (row) => row.dateHebrew,
      },
      {
        id: 'fieldName',
        header: t.sortingDailyDetails.columns.fieldName,
        headerLabel: t.sortingDailyDetails.columns.fieldName,
        sortKey: 'fieldName',
        sortLabel: `${t.sortingDailyDetails.columns.fieldName} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'asc',
        sortAccessor: (row) => row.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.fieldName,
      },
      ...categoryColumns,
      ...summaryColumns,
      {
        id: 'totalSorted',
        header: t.sortingDailyDetails.columns.totalSorted,
        headerLabel: t.sortingDailyDetails.columns.totalSorted,
        sortKey: 'totalSorted',
        sortLabel: `${t.sortingDailyDetails.columns.totalSorted} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => sortingDailyCategories.reduce((sum, category) => sum + (row.categoryTotals[category.key] ?? 0), 0),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => {
          const rowDailyTotal = sortingDailyCategories.reduce((sum, category) => sum + (row.categoryTotals[category.key] ?? 0), 0);
          return <strong>{numberFormatter.format(rowDailyTotal)}</strong>;
        },
      },
    ];
  }, [
    formatGregorianDate,
    lang,
    numberFormatter,
    setSortingDailyDetailsRowId,
    sortingDailyCategories,
    t.sortingDailyDetails.columns,
  ]);

  return {
    columns,
    fieldReportColumns,
    sortingDailyColumns,
  };
}
