import type { HarvestRecord } from '../../../../services/harvestsApi';

export type HarvestFieldReportDetailsData = {
  fieldName: string;
  seasonName: string;
  recordCount: number;
  summaryStatus: string;
  summaryRows: Array<{
    key: string;
    kind: 'regular' | 'summary';
    label: string;
    totalHarvested: string;
    totalRejected: string;
    totalAfterRejected: string;
    classifiedTotal: string;
    rejectionRate: string;
  }>;
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
  updatedBy: string;
  notes: string;
  none: string;
  emptyRows: string;
};

export function HarvestFieldReportDetailsPanel({ data, locale, labels }: HarvestFieldReportDetailsPanelProps): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="harvest-daily-workspace__sheet-card">
        <div className="harvest-daily-workspace__sheet-head">
          <p>
            <strong>{labels.season}:</strong> {data.seasonName}
          </p>
          <p>
            <strong>{labels.field}:</strong> {data.fieldName}
          </p>
          <p>
            <strong>{labels.recordCount}:</strong> {data.recordCount}
          </p>
        </div>

        <div className="harvest-daily-workspace__sheet-status">{data.summaryStatus}</div>

        <table className="harvest-daily-workspace__sheet-table">
          <thead>
            <tr>
              <th scope="col" aria-label={labels.rowType} />
              <th scope="col">{labels.totalHarvested}</th>
              <th scope="col">{labels.totalRejected}</th>
              <th scope="col">{labels.netHarvest}</th>
              <th scope="col">{labels.classifiedTotal}</th>
              <th scope="col">{labels.rejectionRate}</th>
            </tr>
          </thead>
          <tbody>
            {data.summaryRows.map((row) => (
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
      </div>

      <div className="harvest-daily-workspace__related-sortings-card">
        <h4 className="harvest-daily-workspace__related-sortings-title">{labels.rowsTitle}</h4>

        {data.rows.length === 0 ? (
          <p className="harvest-daily-workspace__related-sortings-state">{labels.emptyRows}</p>
        ) : (
          <div className="harvest-daily-workspace__related-sortings-table-wrap">
            <table className="harvest-daily-workspace__related-sortings-table">
              <thead>
                <tr>
                  <th>{labels.dateGregorian}</th>
                  <th>{labels.dateHebrew}</th>
                  <th>{labels.totalHarvested}</th>
                  <th>{labels.totalRejected}</th>
                  <th>{labels.netHarvest}</th>
                  <th>{labels.classifiedTotal}</th>
                  <th>{labels.rejectionRate}</th>
                  <th>{labels.updatedBy}</th>
                  <th>{labels.notes}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rowIndex) => {
                  const note = row.notes?.trim() ?? '';

                  return (
                    <tr key={row.id}>
                      <td>{new Date(row.dateGregorian).toLocaleDateString(locale)}</td>
                      <td>{row.dateHebrew || labels.none}</td>
                      <td>{row.totalHarvested.toLocaleString(locale)}</td>
                      <td>{row.totalRejected.toLocaleString(locale)}</td>
                      <td>{row.totalAfterRejected.toLocaleString(locale)}</td>
                      <td>{row.classifiedTotal.toLocaleString(locale)}</td>
                      <td>{`${Number(row.rejectionRate).toLocaleString(locale, { maximumFractionDigits: 2 })}%`}</td>
                      <td>{row.updatedBy?.name ?? labels.none}</td>
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
    </div>
  );
}

