import { useMemo } from 'react';
import type { IsraelShipmentItemDetailRow } from '../../services/israelShipmentItemsDetailRows.service';
import type { IsraelAllShipmentsTableLabels } from '../../israelShipments.types';
import styles from '../../../../shipments/components/styles/AllShipmentsTable.module.css';

type IsraelShipmentItemsDetailTableProps = {
  rows: IsraelShipmentItemDetailRow[];
  labels: IsraelAllShipmentsTableLabels['detailsItemsTable'];
  showBoxNumber?: boolean;
};

function computeMergedRowSpans(rows: IsraelShipmentItemDetailRow[], getKey: (row: IsraelShipmentItemDetailRow) => string): number[] {
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

export function IsraelShipmentItemsDetailTable({ rows, labels, showBoxNumber = true }: IsraelShipmentItemsDetailTableProps): JSX.Element {
  const boxNumberRowSpans = useMemo(
    () => computeMergedRowSpans(rows, (row) => String(row.boxNumber)),
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
              <th scope="col">{labels.colCategory}</th>
              <th scope="col">{labels.colGrade}</th>
              <th scope="col">{labels.colPitamStatus}</th>
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
                <td>{row.category}</td>
                <td>{row.grade}</td>
                <td>{row.pitamStatus}</td>
                <td>{row.quantity.toLocaleString()}</td>
                <td>{row.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
