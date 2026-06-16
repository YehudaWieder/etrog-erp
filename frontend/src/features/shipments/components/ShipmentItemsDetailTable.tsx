import { useMemo } from 'react';
import type { ShipmentItemDetailRow } from '../services/shipmentItemsDetailRows.service';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentItemsDetailTableProps = {
  rows: ShipmentItemDetailRow[];
  labels: ShipmentsTableLabels['detailsItemsTable'];
  showBoxNumber?: boolean;
};

// For each row: the number of rows to merge into it (rowSpan) if it starts a run of
// consecutive rows sharing the same key, or 0 if it's part of the previous row's merged cell.
function computeMergedRowSpans(rows: ShipmentItemDetailRow[], getKey: (row: ShipmentItemDetailRow) => string): number[] {
  const spans = new Array(rows.length).fill(0);
  let groupStart = 0;

  while (groupStart < rows.length) {
    let groupEnd = groupStart;
    while (groupEnd + 1 < rows.length && getKey(rows[groupEnd + 1]) === getKey(rows[groupStart])) {
      groupEnd++;
    }

    spans[groupStart] = groupEnd - groupStart + 1;
    groupStart = groupEnd + 1;
  }

  return spans;
}

export function ShipmentItemsDetailTable({ rows, labels, showBoxNumber = true }: ShipmentItemsDetailTableProps): JSX.Element {
  const boxNumberRowSpans = useMemo(
    () => computeMergedRowSpans(rows, (row) => String(row.boxNumber)),
    [rows],
  );
  const ownershipRowSpans = useMemo(
    () => computeMergedRowSpans(rows, (row) => `${row.boxNumber}|${row.ownership}`),
    [rows],
  );
  const stockSourceRowSpans = useMemo(
    () => computeMergedRowSpans(rows, (row) => `${row.boxNumber}|${row.ownership}|${row.stockSource}`),
    [rows],
  );

  return (
    <div className={`shipment-details-print__card ${styles.detailsSummaryCard}`}>
      <h4 className={`shipment-details-print__title ${styles.detailsSummaryTitle}`}>{labels.title}</h4>

      <div className={`shipment-details-print__table-wrap ${styles.detailsSummaryTableWrap}`}>
        <table className={`shipment-details-print__table ${styles.detailsSummaryTable}`}>
          <thead>
            <tr>
              {showBoxNumber ? <th scope="col">{labels.colBoxNumber}</th> : null}
              <th scope="col">{labels.colOwnership}</th>
              <th scope="col">{labels.colStockSource}</th>
              <th scope="col">{labels.colCategory}</th>
              <th scope="col">{labels.colGrade}</th>
              <th scope="col">{labels.colQuantity}</th>
              <th scope="col">{labels.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {showBoxNumber && boxNumberRowSpans[rowIndex] > 0 ? (
                  <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`} rowSpan={boxNumberRowSpans[rowIndex]}>{row.boxNumber}</td>
                ) : null}
                {ownershipRowSpans[rowIndex] > 0 ? (
                  <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`} rowSpan={ownershipRowSpans[rowIndex]}>{row.ownership}</td>
                ) : null}
                {stockSourceRowSpans[rowIndex] > 0 ? (
                  <td rowSpan={stockSourceRowSpans[rowIndex]}>{row.stockSource}</td>
                ) : null}
                <td>{row.category}</td>
                <td>{row.grade}</td>
                <td>{row.quantity.toLocaleString()}</td>
                <td>
                  {row.notes ? (
                    <>
                      <span
                        className={`shipment-details-print__note-hide ${styles.detailsItemsNote}${rowIndex === 0 ? ` ${styles.detailsItemsNoteFirstRow}` : ''}`}
                        tabIndex={0}
                        aria-label={row.notes}
                      >
                        <span className={styles.detailsItemsNoteBubble} aria-hidden="true" />
                        <span className={styles.detailsItemsNoteTooltip}>{row.notes}</span>
                      </span>
                      <span className={`shipment-details-print__note-text ${styles.detailsItemsNotePrintText}`}>{row.notes}</span>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
