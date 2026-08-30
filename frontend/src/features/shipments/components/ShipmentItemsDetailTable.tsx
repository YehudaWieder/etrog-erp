import { useMemo } from 'react';
import { computeMergedRowSpans, type ShipmentItemDetailRow } from '../services/shipmentItemsDetailRows.service';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentItemsDetailTableProps = {
  rows: ShipmentItemDetailRow[];
  labels: ShipmentsTableLabels['detailsItemsTable'];
  showBoxNumber?: boolean;
  shipmentNumberColumnLabel?: string;
  mergeRepeatedCells?: boolean;
};

// A rowSpan cell can't be split across a printed page, so the browser keeps its whole
// merged group together — a long merged group can force blank pages before it. When
// mergeRepeatedCells is off, every row gets its own cell (rowSpan of 1) so pagination
// can break anywhere.
function computeRowSpans(
  rows: ShipmentItemDetailRow[],
  getKey: (row: ShipmentItemDetailRow) => string,
  mergeRepeatedCells: boolean,
): number[] {
  if (!mergeRepeatedCells) {
    return rows.map(() => 1);
  }

  return computeMergedRowSpans(rows, getKey);
}

export function ShipmentItemsDetailTable({ rows, labels, showBoxNumber = true, shipmentNumberColumnLabel, mergeRepeatedCells = true }: ShipmentItemsDetailTableProps): JSX.Element {
  const showShipmentNumber = Boolean(shipmentNumberColumnLabel);
  const boxNumberRowSpans = useMemo(
    () => computeRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}`, mergeRepeatedCells),
    [rows, mergeRepeatedCells],
  );
  const ownershipRowSpans = useMemo(
    () => computeRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}`, mergeRepeatedCells),
    [rows, mergeRepeatedCells],
  );
  const stockSourceRowSpans = useMemo(
    () => computeRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}|${row.stockSource}`, mergeRepeatedCells),
    [rows, mergeRepeatedCells],
  );
  const categoryRowSpans = useMemo(
    () => computeRowSpans(rows, (row) => `${row.shipmentNumber ?? ''}|${row.boxNumber}|${row.ownership}|${row.stockSource}|${row.category}`, mergeRepeatedCells),
    [rows, mergeRepeatedCells],
  );

  return (
    <div className={`shipment-details-print__table-card ${styles.detailsSummaryCard}`}>
      <h4 className={`shipment-details-print__title ${styles.detailsSummaryTitle}`}>{labels.title}</h4>

      <div className={`shipment-details-print__table-wrap ${styles.detailsSummaryTableWrap}`}>
        <table className={`shipment-details-print__table ${styles.detailsSummaryTable}`}>
          <thead>
            <tr>
              {showShipmentNumber ? <th scope="col">{shipmentNumberColumnLabel}</th> : null}
              {showBoxNumber ? <th scope="col">{labels.colBoxNumber}</th> : null}
              <th scope="col">{labels.colOwnership}</th>
              <th scope="col">{labels.colStockSource}</th>
              <th scope="col">{labels.colCategory}</th>
              <th scope="col">{labels.colGrade}</th>
              <th scope="col">{labels.colPitamStatus}</th>
              <th scope="col">{labels.colQuantity}</th>
              <th scope="col">{labels.colGeneralSourceBreakdown}</th>
              <th scope="col">{labels.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {showShipmentNumber ? (
                  <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`}>{row.shipmentNumber}</td>
                ) : null}
                {showBoxNumber && boxNumberRowSpans[rowIndex] > 0 ? (
                  <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`} rowSpan={boxNumberRowSpans[rowIndex]}>{row.boxNumber}</td>
                ) : null}
                {ownershipRowSpans[rowIndex] > 0 ? (
                  <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`} rowSpan={ownershipRowSpans[rowIndex]}>{row.ownership}</td>
                ) : null}
                {stockSourceRowSpans[rowIndex] > 0 ? (
                  <td rowSpan={stockSourceRowSpans[rowIndex]}>{row.stockSource}</td>
                ) : null}
                {categoryRowSpans[rowIndex] > 0 ? (
                  <td rowSpan={categoryRowSpans[rowIndex]}>{row.category}</td>
                ) : null}
                <td>{row.grade}</td>
                <td>{row.pitamStatus}</td>
                <td>{row.quantity.toLocaleString()}</td>
                <td>
                  {row.generalSourceBreakdown && row.generalSourceBreakdown.length > 0 ? (
                    <ul style={{ margin: 0, paddingInlineStart: '16px' }}>
                      {row.generalSourceBreakdown.map((entry, i) => (
                        <li key={i}>{entry.traderName ?? labels.generalSourceModuloLabel}: {entry.quantity}</li>
                      ))}
                    </ul>
                  ) : '—'}
                </td>
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
