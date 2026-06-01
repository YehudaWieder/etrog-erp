import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  GLOBAL_DATA_TABLE_WIDTHS,
  type GlobalDataTableColumn,
} from '../../../../components/ui/GlobalDataTable';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import type { ClassificationDailySummaryCategory, ClassificationDailySummaryRow } from '../../../../services/classificationsApi';
import type { HarvestI18n } from '../../i18n';
import type {
  FieldReportNumericColumnKey,
  HarvestFieldReportRow,
  HarvestNumericColumnKey,
  SortingDailyNumericColumnKey,
} from '../../harvestPage.types';
import { buildSortingCategoryDisplayLabel } from '../../utils/harvestPage.utils';
import { HarvestDetailsTriggerButton } from '../../components/shared/HarvestDetailsTriggerButton';
import interactiveStyles from '../../components/styles/HarvestInteractive.module.css';

type UseHarvestTableColumnsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
  formatRate: (value: number | string) => string;
  sortingDailyCategories: ClassificationDailySummaryCategory[];
  setDetailsRecord: (value: HarvestRecord | null) => void;
  setFieldReportDetailsFieldId: (value: number | null) => void;
  setSortingDailyDetailsRowId: (value: number | null) => void;
  renderNumericCell: (
    row: HarvestRecord,
    column: HarvestNumericColumnKey,
    value: number,
    content?: ReactNode,
  ) => ReactNode;
  renderFieldReportNumericCell: (
    row: HarvestFieldReportRow,
    column: FieldReportNumericColumnKey,
    value: number,
    content?: ReactNode,
  ) => ReactNode;
  renderSortingNumericCell: (
    row: ClassificationDailySummaryRow,
    column: SortingDailyNumericColumnKey,
    value: number,
    content?: ReactNode,
    className?: string,
    selectedClassName?: string,
  ) => ReactNode;
  isPartialClassificationFlag: (value: unknown) => boolean;
};

export function useHarvestTableColumns({
  lang,
  t,
  formatGregorianDate,
  numberFormatter,
  formatRate,
  sortingDailyCategories,
  setDetailsRecord,
  setFieldReportDetailsFieldId,
  setSortingDailyDetailsRowId,
  renderNumericCell,
  renderFieldReportNumericCell,
  renderSortingNumericCell,
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
        render: (row) => renderNumericCell(row, 'totalHarvested', row.totalHarvested),
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
        render: (row) => renderNumericCell(row, 'totalRejected', row.totalRejected),
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
        render: (row) => renderNumericCell(row, 'totalAfterRejected', row.totalAfterRejected),
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
        render: (row) =>
          renderNumericCell(
            row,
            'classifiedTotal',
            row.classifiedTotal,
            <span
              className={`${interactiveStyles.classifiedTotal}${isPartialClassificationFlag(row.isPartialClassification as unknown) ? ` ${interactiveStyles.classifiedTotalPartial}` : ''}`}
            >
              {row.classifiedTotal}
            </span>,
          ),
      },
    ];
  }, [formatGregorianDate, isPartialClassificationFlag, lang, renderNumericCell, setDetailsRecord, t]);

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
        id: 'totalHarvested',
        header: t.dailyDetails.columns.totalHarvested,
        headerLabel: t.dailyDetails.columns.totalHarvested,
        sortKey: 'totalHarvested',
        sortLabel: `${t.dailyDetails.columns.totalHarvested} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalHarvested,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) =>
          renderFieldReportNumericCell(row, 'totalHarvested', row.totalHarvested, numberFormatter.format(row.totalHarvested)),
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
        render: (row) =>
          renderFieldReportNumericCell(row, 'totalRejected', row.totalRejected, numberFormatter.format(row.totalRejected)),
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
        render: (row) =>
          renderFieldReportNumericCell(
            row,
            'totalAfterRejected',
            row.totalAfterRejected,
            numberFormatter.format(row.totalAfterRejected),
          ),
      },
      {
        id: 'rejectionRate',
        header: t.dailyDetails.detailsPanel.fields.rejectionRate,
        headerLabel: t.dailyDetails.detailsPanel.fields.rejectionRate,
        sortKey: 'rejectionRate',
        sortLabel: `${t.dailyDetails.detailsPanel.fields.rejectionRate} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.rejectionRate,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericPercent,
        align: 'center',
        render: (row) => renderFieldReportNumericCell(row, 'rejectionRate', row.rejectionRate, formatRate(row.rejectionRate)),
      },
    ];
  }, [
    formatRate,
    lang,
    numberFormatter,
    renderFieldReportNumericCell,
    setFieldReportDetailsFieldId,
    t.dailyDetails.columns,
    t.dailyDetails.detailsPanel.fields,
  ]);

  const sortingDailyColumns = useMemo<GlobalDataTableColumn<ClassificationDailySummaryRow>[]>(() => {
    const sortingCategoryColumns: GlobalDataTableColumn<ClassificationDailySummaryRow>[] = sortingDailyCategories.map(
      (category) => {
        const categoryLabel = buildSortingCategoryDisplayLabel(category, lang);
        const columnKey = `category:${category.key}` as SortingDailyNumericColumnKey;

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
          render: (row) => {
            const categoryTotal = row.categoryTotals[category.key] ?? 0;

            return renderSortingNumericCell(
              row,
              columnKey,
              categoryTotal,
              numberFormatter.format(categoryTotal),
            );
          },
        };
      },
    );

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
      ...sortingCategoryColumns,
      {
        id: 'totalSorted',
        header: t.sortingDailyDetails.columns.totalSorted,
        headerLabel: t.sortingDailyDetails.columns.totalSorted,
        sortKey: 'totalSorted',
        sortLabel: `${t.sortingDailyDetails.columns.totalSorted} - ${t.tableLabels.sort}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) =>
          sortingDailyCategories.reduce((sum, category) => sum + (row.categoryTotals[category.key] ?? 0), 0),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => {
          const rowDailyTotal = sortingDailyCategories.reduce(
            (sum, category) => sum + (row.categoryTotals[category.key] ?? 0),
            0,
          );

          return renderSortingNumericCell(
            row,
            'totalSorted',
            rowDailyTotal,
            <strong>{numberFormatter.format(rowDailyTotal)}</strong>,
          );
        },
      },
    ];
  }, [
    formatGregorianDate,
    lang,
    numberFormatter,
    renderSortingNumericCell,
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



