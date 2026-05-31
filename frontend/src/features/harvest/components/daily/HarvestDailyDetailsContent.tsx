import type { ClassificationRecord } from '../../../../services/classificationsApi';

export type DetailsSheetData = {
  dateGregorian: string;
  dateHebrew: string;
  seasonName: string | number;
  harvestNumber: string;
  updatedByName: string;
  fieldName: string;
  statusLabel: string;
  notes: string;
  labels: {
    season: string;
    harvestNumber: string;
    updatedBy: string;
    field: string;
    totalHarvested: string;
    totalRejected: string;
    totalAfterRejected: string;
    classifiedTotal: string;
    rejectionRate: string;
    notes: string;
  };
  values: {
    rowType: string;
    none: string;
  };
  rows: Array<{
    key: string;
    kind: string;
    label: string;
    totalHarvested: string;
    totalRejected: string;
    totalAfterRejected: string;
    classifiedTotal: string;
    rejectionRate: string;
  }>;
};

export type RelatedSortingsLabels = {
  title: string;
  loading: string;
  empty: string;
  columns: {
    assignmentType: string;
    target: string;
    category: string;
    grade: string;
    pitamStatus: string;
    quantity: string;
    updatedBy: string;
    notes: string;
  };
};

export type HarvestDailyDetailsContentProps = {
  detailsSheetData: DetailsSheetData;
  relatedSortingsLabels: RelatedSortingsLabels;
  isRelatedSortingsLoading: boolean;
  relatedSortingsLoadError: string;
  relatedSortings: ClassificationRecord[];
  sortedRelatedSortings: ClassificationRecord[];
  numberFormatter: Intl.NumberFormat;
  formatRelatedSortingText: (value?: string | null) => string;
  getRelatedSortingAssignmentLabel: (assignmentType: string) => string;
  getRelatedSortingTarget: (row: ClassificationRecord) => string;
  getRelatedSortingCategory: (row: ClassificationRecord) => string;
  getRelatedSortingGrade: (row: ClassificationRecord) => string;
  getRelatedSortingNote: (row: ClassificationRecord) => string;
};

export function HarvestDailyDetailsContent({
  detailsSheetData,
  relatedSortingsLabels,
  isRelatedSortingsLoading,
  relatedSortingsLoadError,
  relatedSortings,
  sortedRelatedSortings,
  numberFormatter,
  formatRelatedSortingText,
  getRelatedSortingAssignmentLabel,
  getRelatedSortingTarget,
  getRelatedSortingCategory,
  getRelatedSortingGrade,
  getRelatedSortingNote,
}: HarvestDailyDetailsContentProps): JSX.Element {
  return (
    <>
      <div className="harvest-daily-workspace__sheet-card">
        <div className="harvest-daily-workspace__sheet-head">
          <p>{detailsSheetData.dateGregorian}</p>
          <p>{detailsSheetData.dateHebrew}</p>
          <p>
            <strong>{detailsSheetData.labels.season}:</strong> {detailsSheetData.seasonName}
          </p>
          <p>
            <strong>{detailsSheetData.labels.harvestNumber}:</strong> {detailsSheetData.harvestNumber}
          </p>
          <p>
            <strong>{detailsSheetData.labels.updatedBy}:</strong> {detailsSheetData.updatedByName}
          </p>
          <p>
            <strong>{detailsSheetData.labels.field}:</strong> {detailsSheetData.fieldName}
          </p>
        </div>

        <div className="harvest-daily-workspace__sheet-status">{detailsSheetData.statusLabel}</div>

        <table className="harvest-daily-workspace__sheet-table">
          <thead>
            <tr>
              <th aria-label={detailsSheetData.values.rowType} />
              <th>{detailsSheetData.labels.totalHarvested}</th>
              <th>{detailsSheetData.labels.totalRejected}</th>
              <th>{detailsSheetData.labels.totalAfterRejected}</th>
              <th>{detailsSheetData.labels.classifiedTotal}</th>
              <th>{detailsSheetData.labels.rejectionRate}</th>
            </tr>
          </thead>
          <tbody>
            {detailsSheetData.rows.map((row) => (
              <tr key={row.key} className={row.kind === 'summary' ? 'harvest-daily-workspace__sheet-row--summary' : undefined}>
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

        {detailsSheetData.notes ? (
          <p className="harvest-daily-workspace__sheet-note">
            <strong>{detailsSheetData.labels.notes}:</strong> {detailsSheetData.notes}
          </p>
        ) : null}
      </div>

      <div className="harvest-daily-workspace__related-sortings-card">
        <h4 className="harvest-daily-workspace__related-sortings-title">{relatedSortingsLabels.title}</h4>

        {isRelatedSortingsLoading ? (
          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.loading}</p>
        ) : relatedSortingsLoadError ? (
          <p className="harvest-daily-workspace__related-sortings-state is-error">{relatedSortingsLoadError}</p>
        ) : relatedSortings.length === 0 ? (
          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.empty}</p>
        ) : (
          <div className="harvest-daily-workspace__related-sortings-table-wrap">
            <table className="harvest-daily-workspace__related-sortings-table">
              <colgroup>
                <col className="harvest-daily-workspace__related-sortings-col--assignment-type" />
                <col className="harvest-daily-workspace__related-sortings-col--target" />
                <col className="harvest-daily-workspace__related-sortings-col--category" />
                <col className="harvest-daily-workspace__related-sortings-col--grade" />
                <col className="harvest-daily-workspace__related-sortings-col--pitam" />
                <col className="harvest-daily-workspace__related-sortings-col--quantity" />
                <col className="harvest-daily-workspace__related-sortings-col--updated-by" />
                <col className="harvest-daily-workspace__related-sortings-col--notes" />
              </colgroup>
              <thead>
                <tr>
                  <th>{relatedSortingsLabels.columns.assignmentType}</th>
                  <th>{relatedSortingsLabels.columns.target}</th>
                  <th>{relatedSortingsLabels.columns.category}</th>
                  <th>{relatedSortingsLabels.columns.grade}</th>
                  <th>{relatedSortingsLabels.columns.pitamStatus}</th>
                  <th>{relatedSortingsLabels.columns.quantity}</th>
                  <th>{relatedSortingsLabels.columns.updatedBy}</th>
                  <th>{relatedSortingsLabels.columns.notes}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRelatedSortings.map((row, rowIndex) => {
                  const note = getRelatedSortingNote(row);

                  return (
                    <tr key={row.id}>
                      <td>{getRelatedSortingAssignmentLabel(row.assignmentType)}</td>
                      <td>{getRelatedSortingTarget(row)}</td>
                      <td>{getRelatedSortingCategory(row)}</td>
                      <td>{getRelatedSortingGrade(row)}</td>
                      <td>{formatRelatedSortingText(row.pitamStatus)}</td>
                      <td>{numberFormatter.format(row.quantity)}</td>
                      <td>{row.updatedBy?.name ?? detailsSheetData.values.none}</td>
                      <td>
                        {note ? (
                          <span
                            className={`harvest-daily-workspace__related-sorting-note${rowIndex === 0 ? ' is-first-row' : ''}`}
                            tabIndex={0}
                            aria-label={note}
                          >
                            <span className="harvest-daily-workspace__related-sorting-note-bubble" aria-hidden="true" />
                            <span className="harvest-daily-workspace__related-sorting-note-tooltip">{note}</span>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

