import type { HarvestRecord } from '../../../../services/harvestsApi';
import styles from '../styles/HarvestDetailsSheet.module.css';

export type HarvestFieldReportDetailsSummaryRow = {
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

export type HarvestFieldReportDetailsData = {
  fieldName: string;
  seasonName: string;
  recordCount: number;
  badPickQuantity: number;
  summaryStatus: string;
  summaryRows: HarvestFieldReportDetailsSummaryRow[];
  rows: HarvestRecord[];
};

type HarvestFieldReportDetailsPanelProps = {
  data: HarvestFieldReportDetailsData;
  locale: string;
  labels: HarvestFieldReportDetailsPanelLabels;
};

export type HarvestFieldReportDetailsPanelLabels = {
  rowType: string;
  rowsTitle: string;
  season: string;
  field: string;
  recordCount: string;
  dateGregorian: string;
  dateHebrew: string;
  totalHarvested: string;
  totalRejected: string;
  netHarvest: string;
  classifiedTotal: string;
  rejectionRate: string;
  uncalculatedRejected: string;
  rejectionRateExcludingBadPicks: string;
  harvestExcludingBadPicks: string;
  notes: string;
  none: string;
  emptyRows: string;
  badPickQuantity: string;
};

export function HarvestFieldReportDetailsPanel({ data, locale, labels }: HarvestFieldReportDetailsPanelProps): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={`${styles.sheetCard} harvest-daily-workspace__sheet-card`}>
        <div className={`${styles.sheetHead} harvest-daily-workspace__sheet-head`}>
          <p>
            <strong>{labels.season}:</strong> {data.seasonName}
          </p>
          <p>
            <strong>{labels.field}:</strong> {data.fieldName}
          </p>
          <p>
            <strong>{labels.recordCount}:</strong> {data.recordCount}
          </p>
          <p>
            <strong>{labels.badPickQuantity}:</strong> {data.badPickQuantity}
          </p>
        </div>

        <div className={`${styles.sheetStatus} harvest-daily-workspace__sheet-status`}>{data.summaryStatus}</div>

        <div className={styles.sheetTableWrap}>
          <table className={`${styles.sheetTable} harvest-daily-workspace__sheet-table`}>
            <thead>
              <tr>
                <th scope="col" aria-label={labels.rowType} />
                <th scope="col">{labels.totalHarvested}</th>
                <th scope="col">{labels.totalRejected}</th>
                <th scope="col">{labels.netHarvest}</th>
                <th scope="col">{labels.classifiedTotal}</th>
                <th scope="col">{labels.rejectionRate}</th>
                {data.badPickQuantity > 0 ? (
                  <>
                    <th scope="col">{labels.harvestExcludingBadPicks}</th>
                    <th scope="col">{labels.uncalculatedRejected}</th>
                    <th scope="col">{labels.rejectionRateExcludingBadPicks}</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {data.summaryRows.map((row) => (
                <tr key={row.key} className={row.kind === 'summary' ? `${styles.sheetRowSummary} harvest-daily-workspace__sheet-row--summary` : undefined}>
                  <td>{row.label}</td>
                  <td>{row.totalHarvested}</td>
                  <td>{row.totalRejected}</td>
                  <td>{row.totalAfterRejected}</td>
                  <td>{row.classifiedTotal}</td>
                  <td>{row.rejectionRate}</td>
                  {data.badPickQuantity > 0 ? (
                    <>
                      <td>{row.harvestExcludingBadPicks}</td>
                      <td>{row.uncalculatedRejected}</td>
                      <td>{row.rejectionRateExcludingBadPicks}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${styles.relatedSortingsCard} harvest-daily-workspace__related-sortings-card`}>
        <h4 className={`${styles.relatedSortingsTitle} harvest-daily-workspace__related-sortings-title`}>{labels.rowsTitle}</h4>

        {data.rows.length === 0 ? (
          <p className={styles.relatedSortingsState}>{labels.emptyRows}</p>
        ) : (
          <div className={`${styles.relatedSortingsTableWrap} harvest-daily-workspace__related-sortings-table-wrap`}>
            <table className={`${styles.relatedSortingsTable} harvest-daily-workspace__related-sortings-table`}>
              <thead>
                <tr>
                  <th>{labels.dateGregorian}</th>
                  <th>{labels.dateHebrew}</th>
                  <th>{labels.totalHarvested}</th>
                  <th>{labels.totalRejected}</th>
                  <th>{labels.netHarvest}</th>
                  <th>{labels.classifiedTotal}</th>
                  <th>{labels.rejectionRate}</th>
                  {data.badPickQuantity > 0 ? (
                    <>
                      <th>{labels.harvestExcludingBadPicks}</th>
                      <th>{labels.uncalculatedRejected}</th>
                      <th>{labels.rejectionRateExcludingBadPicks}</th>
                    </>
                  ) : null}
                  <th>{labels.notes}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rowIndex) => {
                  const note = row.notes?.trim() ?? '';
                  const harvestExcludingBadPicks = row.totalHarvested - row.uncalculatedRejected;
                  const rejectedExcludingBadPicks = row.totalRejected - row.uncalculatedRejected;
                  const rejectionRateExcludingBadPicks = harvestExcludingBadPicks > 0
                    ? (rejectedExcludingBadPicks / harvestExcludingBadPicks) * 100
                    : 0;

                  return (
                    <tr key={row.id}>
                      <td>{new Date(row.dateGregorian).toLocaleDateString(locale)}</td>
                      <td>{row.dateHebrew || labels.none}</td>
                      <td>{row.totalHarvested.toLocaleString(locale)}</td>
                      <td>{row.totalRejected.toLocaleString(locale)}</td>
                      <td>{row.totalAfterRejected.toLocaleString(locale)}</td>
                      <td>{row.classifiedTotal.toLocaleString(locale)}</td>
                      <td>{`${Number(row.rejectionRate).toLocaleString(locale, { maximumFractionDigits: 2 })}%`}</td>
                      {data.badPickQuantity > 0 ? (
                        <>
                          <td>{harvestExcludingBadPicks.toLocaleString(locale)}</td>
                          <td>{rejectedExcludingBadPicks.toLocaleString(locale)}</td>
                          <td>{`${rejectionRateExcludingBadPicks.toLocaleString(locale, { maximumFractionDigits: 2 })}%`}</td>
                        </>
                      ) : null}
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
    </div>
  );
}

