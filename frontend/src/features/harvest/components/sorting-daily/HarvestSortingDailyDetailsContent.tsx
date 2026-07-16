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

export type SortingDailyCategoryBreakdown = {
  label: string;
  total: number;
  pitamHeaders: Array<{
    key: string;
    label: string;
    total: number;
  }>;
  gradeRows: Array<{
    grade: string;
    values: Record<string, number>;
    total: number;
  }>;
};

import styles from '../styles/HarvestDetailsSheet.module.css';

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
  categoryBreakdown: SortingDailyCategoryBreakdown[];
  isDetailRowsLoading: boolean;
  detailRowsLoadError: string;
  emptyLabel: string;
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
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
  isDetailRowsLoading,
  detailRowsLoadError,
  emptyLabel,
  formatGregorianDate,
  numberFormatter,
  labels,
}: HarvestSortingDailyDetailsContentProps): JSX.Element {
  const summaryFields = t.dailyDetails.detailsPanel.fields;

  return (
    <>
      <div className={`${styles.sheetCard} harvest-daily-workspace__sheet-card`}>
        <div className={`${styles.sheetHead} harvest-daily-workspace__sheet-head`}>
          <p>
            <strong>{labels.dateGregorian}:</strong> {formatGregorianDate(data.row.dateGregorian)}
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
            <div className={`${styles.sheetStatus} harvest-daily-workspace__sheet-status`}>{summary.statusLabel}</div>

            <div className={styles.sheetTableWrap}>
              <table className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`}>
                <thead>
                  <tr>
                    <th aria-label={t.dailyDetails.detailsPanel.values.rowType} />
                    <th>{summaryFields.totalHarvested}</th>
                    <th>{summaryFields.totalRejected}</th>
                    <th>{summaryFields.totalAfterRejected}</th>
                    <th>{summaryFields.classifiedTotal}</th>
                    <th>{summaryFields.rejectionRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.key} className={row.kind === 'summary' ? `${styles.sheetRowSummary} harvest-daily-workspace__sheet-row--summary` : undefined}>
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

        <div className={styles.sheetTableWrap}>
          <table className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`} style={{ marginTop: 18 }}>
            <thead>
              <tr>
                <th>{t.sortingDailyDetails.table.category}</th>
                <th>{t.sortingDailyDetails.table.quantity}</th>
              </tr>
            </thead>
            <tbody>
              {data.rowCategories.length === 0 ? (
                <tr>
                  <td colSpan={2}>{emptyLabel}</td>
                </tr>
              ) : (
                data.rowCategories.map((category) => (
                  <tr key={`sorting-details-${data.row.harvestId}-${category.key}`}>
                    <td>{category.label}</td>
                    <td>{numberFormatter.format(category.value)}</td>
                  </tr>
                ))
              )}

              <tr className={`${styles.sheetRowSummary} harvest-daily-workspace__sheet-row--summary`}>
                <td>{t.sortingDailyDetails.table.dailyTotal}</td>
                <td>{numberFormatter.format(data.rowDailyTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {isDetailRowsLoading ? (
        <p className={styles.detailsEmpty} style={{ marginTop: 14 }}>
          {t.sortingDailyDetails.table.loadingCategoryBreakdown}
        </p>
      ) : null}

      {detailRowsLoadError ? (
        <p className="harvest-daily-workspace__details-error" style={{ marginTop: 14 }}>
          {detailRowsLoadError}
        </p>
      ) : null}

      {!isDetailRowsLoading && !detailRowsLoadError ? (
        categoryBreakdown.length > 0 ? (
          categoryBreakdown.map((category) => (
            <div
              key={`sorting-details-breakdown-${data.row.harvestId}-${category.label}`}
              className={`${styles.sheetCard} ${styles.sheetCardBorderless} ${styles.sheetCardCategoryBreakdown} harvest-daily-workspace__sheet-card harvest-daily-workspace__sheet-card--borderless harvest-daily-workspace__sheet-card--category-breakdown`}
              style={{ marginTop: 14 }}
            >
              <h4 className={`${styles.relatedSortingsTitle} harvest-daily-workspace__related-sortings-title`} style={{ marginTop: 0 }}>
                {category.label}
                <span style={{ marginInlineStart: 8 }}>
                  ({numberFormatter.format(category.total)})
                </span>
              </h4>

              <div className={styles.sheetTableWrap}>
                <table className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`} style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>{t.sortingDailyDetails.table.grade}</th>
                      {category.pitamHeaders.map((header) => (
                        <th key={`sorting-details-pitam-header-${category.label}-${header.key}`}>
                          {header.label} ({numberFormatter.format(header.total)})
                        </th>
                      ))}
                      <th>{t.sortingDailyDetails.table.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.gradeRows.length === 0 ? (
                      <tr>
                        <td colSpan={category.pitamHeaders.length + 2}>{emptyLabel}</td>
                      </tr>
                    ) : (
                      category.gradeRows.map((gradeRow) => (
                        <tr key={`sorting-details-grade-row-${category.label}-${gradeRow.grade}`}>
                          <td>{gradeRow.grade}</td>
                          {category.pitamHeaders.map((header) => (
                            <td key={`sorting-details-grade-cell-${category.label}-${gradeRow.grade}-${header.key}`}>
                              {numberFormatter.format(gradeRow.values[header.key] ?? 0)}
                            </td>
                          ))}
                          <td>{numberFormatter.format(gradeRow.total)}</td>
                        </tr>
                      ))
                    )}

                    <tr className={`${styles.sheetRowSummary} harvest-daily-workspace__sheet-row--summary`}>
                      <td>{t.sortingDailyDetails.table.total}</td>
                      {category.pitamHeaders.map((header) => (
                        <td key={`sorting-details-summary-${category.label}-${header.key}`}>
                          {numberFormatter.format(header.total)}
                        </td>
                      ))}
                      <td>{numberFormatter.format(category.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.detailsEmpty} style={{ marginTop: 14 }}>
            {t.sortingDailyDetails.table.noCategoryBreakdown}
          </p>
        )
      ) : null}
    </>
  );
}
