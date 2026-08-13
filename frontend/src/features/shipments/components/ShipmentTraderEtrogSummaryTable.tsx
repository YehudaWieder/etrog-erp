import type { ShipmentTraderEtrogSummary, ShipmentTraderEtrogSummaryRow } from '../services/shipmentTraderEtrogSummary.service';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentTraderEtrogSummaryTableProps = {
  summary: ShipmentTraderEtrogSummary;
  labels: ShipmentsTableLabels['detailsTraderEtrogSummary'];
};

export function ShipmentTraderEtrogSummaryTable({ summary, labels }: ShipmentTraderEtrogSummaryTableProps): JSX.Element {
  const renderRow = (row: ShipmentTraderEtrogSummaryRow) => (
    <tr key={row.key}>
      <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`}>{row.label}</td>
      {summary.categories.map((category) => (
        <td key={category}>{row.counts[category].toLocaleString()}</td>
      ))}
      <td>{row.total.toLocaleString()}</td>
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
              {summary.categories.map((category) => (
                <th key={category} scope="col">{category}</th>
              ))}
              <th scope="col">{labels.totalColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map(renderRow)}
          </tbody>
          <tfoot>
            <tr className={`shipment-details-print__row-total ${styles.detailsSummaryRowTotal}`}>
              <td>{labels.totalRowLabel}</td>
              {summary.categories.map((category) => (
                <td key={category}>{summary.columnTotals[category].toLocaleString()}</td>
              ))}
              <td>{summary.grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
