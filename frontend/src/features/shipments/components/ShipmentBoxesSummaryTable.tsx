import type { ShipmentBoxesSummary, ShipmentBoxesSummaryRow } from '../services/shipmentBoxesSummary.service';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentBoxesSummaryTableProps = {
  summary: ShipmentBoxesSummary;
  labels: ShipmentsTableLabels['detailsBoxesSummary'];
};

export function ShipmentBoxesSummaryTable({ summary, labels }: ShipmentBoxesSummaryTableProps): JSX.Element {
  const renderRow = (row: ShipmentBoxesSummaryRow) => (
    <tr key={row.key}>
      <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`}>{row.label}</td>
      {summary.boxTypes.map((boxType) => (
        <td key={boxType}>{row.counts[boxType]}</td>
      ))}
      <td>{row.total}</td>
    </tr>
  );

  return (
    <div className={`shipment-details-print__card ${styles.detailsSummaryCard}`}>
      <h4 className={`shipment-details-print__title ${styles.detailsSummaryTitle}`}>{labels.title}</h4>

      <div className={`shipment-details-print__table-wrap ${styles.detailsSummaryTableWrap}`}>
        <table className={`shipment-details-print__table ${styles.detailsSummaryTable}`}>
          <thead>
            <tr>
              <th scope="col" />
              {summary.boxTypes.map((boxType) => (
                <th key={boxType} scope="col">{labels.boxTypeLabels[boxType]}</th>
              ))}
              <th scope="col">{labels.totalColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {renderRow(summary.generalRow)}
            {summary.traderRows.map(renderRow)}
            {summary.customerRows.map(renderRow)}
            {summary.customRow ? renderRow(summary.customRow) : null}
          </tbody>
          <tfoot>
            <tr className={`shipment-details-print__row-total ${styles.detailsSummaryRowTotal}`}>
              <td>{labels.totalRowLabel}</td>
              {summary.boxTypes.map((boxType) => (
                <td key={boxType}>{summary.columnTotals[boxType]}</td>
              ))}
              <td>{summary.grandTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
