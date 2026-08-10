export type SortingDailyDetailsData = {
  row: {
    harvestId: number;
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
  };
  rowCategories: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  rowDailyTotal: number;
};

import type { CategoryGradeGroupSplit } from '../../utils/gradeGroupBreakdown.util';
import type { SortingDailyCategorySections } from '../../hooks/details/useHarvestDetailsData';
import { GradeGroupSplitCards } from '../shared/GradeGroupSplitCards';
import { CategoryGradeMatrixTable } from '../shared/CategoryGradeMatrixTable';
import styles from '../styles/HarvestDetailsSheet.module.css';
import breakdownStyles from './HarvestSortingDailyCategoryBreakdown.module.css';

export type SortingDailySummaryData = {
  statusLabel: string;
  rows: Array<{
    key: string;
    kind: 'regular' | 'summary';
    label: string;
    totalHarvested: string;
    totalRejected: string;
    totalAfterRejected: string;
    classifiedTotal: string;
    rejectionRate: string;
  }>;
};

type HarvestSortingDailyDetailsContentProps = {
  lang: 'he' | 'en';
  t: import('../../i18n').HarvestI18n;
  data: SortingDailyDetailsData;
  summary: SortingDailySummaryData | null;
  categoryBreakdown: SortingDailyCategorySections;
  gradeGroupSplits: CategoryGradeGroupSplit[];
  gradeGroupsLabels: {
    title: string;
    groupColumn: string;
    percentColumn: string;
  };
  locale: string;
  isDetailRowsLoading: boolean;
  detailRowsLoadError: string;
  emptyLabel: string;
  formatGregorianDate: (value: string) => string;
  labels: {
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
  };
};

export function HarvestSortingDailyDetailsContent({
  lang,
  t,
  data,
  summary,
  categoryBreakdown,
  gradeGroupSplits,
  gradeGroupsLabels,
  locale,
  isDetailRowsLoading,
  detailRowsLoadError,
  emptyLabel,
  formatGregorianDate,
  labels,
}: HarvestSortingDailyDetailsContentProps): JSX.Element {
  const summaryFields = t.dailyDetails.detailsPanel.fields;

  const matrixSections = [
    {
      key: 'general',
      title: t.sortingSummary.rows.general,
      matrix: categoryBreakdown.general,
    },
    ...categoryBreakdown.perTrader.map(({ name, matrix }) => ({
      key: `trader:${name}`,
      title: `${t.sortingSummary.rows.privateSorting} – ${name}`,
      matrix,
    })),
    ...categoryBreakdown.perCustomer.map(({ name, matrix }) => ({
      key: `customer:${name}`,
      title: `${t.sortingSummary.rows.customers} – ${name}`,
      matrix,
    })),
  ];
  const hasCategoryBreakdown = matrixSections.some(
    (section) => section.matrix.rows.length > 0,
  );

  return (
    <>
      <div
        className={`${styles.sheetCard} harvest-daily-workspace__sheet-card`}
      >
        <div
          className={`${styles.sheetHead} harvest-daily-workspace__sheet-head`}
        >
          <p>
            <strong>{labels.dateGregorian}:</strong>{' '}
            {formatGregorianDate(data.row.dateGregorian)}
          </p>
          <p>
            <strong>{labels.dateHebrew}:</strong> {data.row.dateHebrew}
          </p>
          <p>
            <strong>{labels.fieldName}:</strong> {data.row.fieldName}
          </p>
        </div>

        {summary ? (
          <>
            <div
              className={`${styles.sheetStatus} harvest-daily-workspace__sheet-status`}
            >
              {summary.statusLabel}
            </div>

            <div className={styles.sheetTableWrap}>
              <table
                className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`}
              >
                <thead>
                  <tr>
                    <th
                      aria-label={t.dailyDetails.detailsPanel.values.rowType}
                    />
                    <th>{summaryFields.totalHarvested}</th>
                    <th>{summaryFields.totalRejected}</th>
                    <th>{summaryFields.totalAfterRejected}</th>
                    <th>{summaryFields.classifiedTotal}</th>
                    <th>{summaryFields.rejectionRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr
                      key={row.key}
                      className={
                        row.kind === 'summary'
                          ? `${styles.sheetRowSummary} harvest-daily-workspace__sheet-row--summary`
                          : undefined
                      }
                    >
                      <td>{row.label}</td>
                      <td>{row.totalHarvested}</td>
                      <td>{row.totalRejected}</td>
                      <td>{row.totalAfterRejected}</td>
                      <td>{row.classifiedTotal}</td>
                      <td>{row.rejectionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      <GradeGroupSplitCards
        title={gradeGroupsLabels.title}
        splits={gradeGroupSplits}
        groupColumnLabel={gradeGroupsLabels.groupColumn}
        percentColumnLabel={gradeGroupsLabels.percentColumn}
        locale={locale}
        compact
      />

      {isDetailRowsLoading ? (
        <p className={styles.detailsEmpty} style={{ marginTop: 14 }}>
          {t.sortingDailyDetails.table.loadingCategoryBreakdown}
        </p>
      ) : null}

      {detailRowsLoadError ? (
        <p
          className="harvest-daily-workspace__details-error"
          style={{ marginTop: 14 }}
        >
          {detailRowsLoadError}
        </p>
      ) : null}

      {!isDetailRowsLoading && !detailRowsLoadError ? (
        hasCategoryBreakdown ? (
          matrixSections.map((section) =>
            section.matrix.rows.length > 0 ? (
              <div
                key={section.key}
                className={`${styles.sheetCard} ${styles.sheetCardBorderless} ${styles.sheetCardCategoryBreakdown} ${breakdownStyles.panelMatrix} harvest-daily-workspace__sheet-card harvest-daily-workspace__sheet-card--borderless harvest-daily-workspace__sheet-card--category-breakdown`}
                style={{ marginTop: 14 }}
              >
                <h4
                  className={`${styles.relatedSortingsTitle} harvest-daily-workspace__related-sortings-title`}
                  style={{ marginTop: 0 }}
                >
                  {section.title}
                </h4>

                <CategoryGradeMatrixTable
                  lang={lang}
                  rows={section.matrix.rows}
                  grades={section.matrix.grades}
                  grandTotalRow={section.matrix.grandTotalRow}
                  categoryColumnLabel={t.sortingDailyDetails.table.category}
                  totalColumnLabel={t.sortingDailyDetails.table.total}
                  emptyLabel={emptyLabel}
                  columnLabels={{
                    withPitam: t.sortingDailyDetails.pitamLabels.withPitam,
                    withoutPitam:
                      t.sortingDailyDetails.pitamLabels.withoutPitam,
                    mixed: t.sortingDailyDetails.pitamLabels.mixed,
                  }}
                />
              </div>
            ) : null,
          )
        ) : (
          <p className={styles.detailsEmpty} style={{ marginTop: 14 }}>
            {t.sortingDailyDetails.table.noCategoryBreakdown}
          </p>
        )
      ) : null}
    </>
  );
}
