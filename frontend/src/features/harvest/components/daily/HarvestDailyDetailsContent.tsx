import type { ClassificationRecord } from '../../../../services/classificationsApi';
import styles from '../styles/HarvestDetailsSheet.module.css';

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
      <div className={`${styles.sheetCard} harvest-daily-workspace__sheet-card`}>
        <div className={`${styles.sheetHead} harvest-daily-workspace__sheet-head`}>
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

        <div className={`${styles.sheetStatus} harvest-daily-workspace__sheet-status`}>{detailsSheetData.statusLabel}</div>

        <div className={styles.sheetTableWrap}>
          <table className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`}>
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

        {detailsSheetData.notes ? (
          <p className={`${styles.sheetNote} harvest-daily-workspace__sheet-note`}>
            <strong>{detailsSheetData.labels.notes}:</strong> {detailsSheetData.notes}
          </p>
        ) : null}
      </div>

      <div className={`${styles.relatedSortingsCard} harvest-daily-workspace__related-sortings-card`}>
        <h4 className={`${styles.relatedSortingsTitle} harvest-daily-workspace__related-sortings-title`}>{relatedSortingsLabels.title}</h4>

        {isRelatedSortingsLoading ? (
          <p className={styles.relatedSortingsState}>{relatedSortingsLabels.loading}</p>
        ) : relatedSortingsLoadError ? (
          <p className={`${styles.relatedSortingsState} ${styles.relatedSortingsStateError}`}>{relatedSortingsLoadError}</p>
        ) : relatedSortings.length === 0 ? (
          <p className={styles.relatedSortingsState}>{relatedSortingsLabels.empty}</p>
        ) : (
          <div className={`${styles.relatedSortingsTableWrap} harvest-daily-workspace__related-sortings-table-wrap`}>
            <table className={`${styles.relatedSortingsTable} harvest-daily-workspace__related-sortings-table`}>
              <colgroup>
                <col className={styles.colAssignmentType} />
                <col className={styles.colTarget} />
                <col className={styles.colCategory} />
                <col className={styles.colGrade} />
                <col className={styles.colPitam} />
                <col className={styles.colQuantity} />
                <col className={styles.colUpdatedBy} />
                <col className={styles.colNotes} />
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
                            className={`${styles.relatedSortingNote} harvest-daily-workspace__related-sorting-note${rowIndex === 0 ? ` ${styles.relatedSortingNoteFirstRow}` : ''}`}
                            tabIndex={0}
                            aria-label={note}
                          >
                            <span className={`${styles.relatedSortingNoteBubble} harvest-daily-workspace__related-sorting-note-bubble`} aria-hidden="true" />
                            <span className={`${styles.relatedSortingNoteTooltip} harvest-daily-workspace__related-sorting-note-tooltip`}>{note}</span>
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

