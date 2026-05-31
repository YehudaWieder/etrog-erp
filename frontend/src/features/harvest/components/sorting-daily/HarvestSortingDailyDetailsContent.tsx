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

type HarvestSortingDailyDetailsContentProps = {
  lang: 'he' | 'en';
  data: SortingDailyDetailsData;
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
  data,
  categoryBreakdown,
  isDetailRowsLoading,
  detailRowsLoadError,
  emptyLabel,
  formatGregorianDate,
  numberFormatter,
  labels,
}: HarvestSortingDailyDetailsContentProps): JSX.Element {
  return (
    <>
      <div className="harvest-daily-workspace__sheet-card">
        <div className="harvest-daily-workspace__sheet-head">
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

        <table className="harvest-daily-workspace__sheet-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>{lang === 'he' ? 'קטגוריה' : 'Category'}</th>
              <th>{lang === 'he' ? 'כמות' : 'Quantity'}</th>
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

            <tr className="harvest-daily-workspace__sheet-row--summary">
              <td>{lang === 'he' ? 'סה"כ יומי' : 'Daily Total'}</td>
              <td>{numberFormatter.format(data.rowDailyTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {isDetailRowsLoading ? (
        <p className="harvest-daily-workspace__details-empty" style={{ marginTop: 14 }}>
          {lang === 'he' ? 'טוען פירוט קטגוריות...' : 'Loading category breakdown...'}
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
              className="harvest-daily-workspace__sheet-card harvest-daily-workspace__sheet-card--borderless harvest-daily-workspace__sheet-card--category-breakdown"
              style={{ marginTop: 14 }}
            >
              <h4 className="harvest-daily-workspace__related-sortings-title" style={{ marginTop: 0 }}>
                {category.label}
                <span style={{ marginInlineStart: 8 }}>
                  ({numberFormatter.format(category.total)})
                </span>
              </h4>

              <table className="harvest-daily-workspace__sheet-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>{lang === 'he' ? 'דרגה' : 'Grade'}</th>
                    {category.pitamHeaders.map((header) => (
                      <th key={`sorting-details-pitam-header-${category.label}-${header.key}`}>
                        {header.label} ({numberFormatter.format(header.total)})
                      </th>
                    ))}
                    <th>{lang === 'he' ? 'סה"כ' : 'Total'}</th>
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

                  <tr className="harvest-daily-workspace__sheet-row--summary">
                    <td>{lang === 'he' ? 'סה"כ' : 'Total'}</td>
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
          ))
        ) : (
          <p className="harvest-daily-workspace__details-empty" style={{ marginTop: 14 }}>
            {lang === 'he' ? 'אין פירוט קטגוריות להצגה.' : 'No category breakdown available.'}
          </p>
        )
      ) : null}
    </>
  );
}
