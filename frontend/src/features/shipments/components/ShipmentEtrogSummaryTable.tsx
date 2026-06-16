import type { ShipmentEtrogSummary, ShipmentEtrogSummaryRow } from '../services/shipmentEtrogSummary.service';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentEtrogSummaryTableProps = {
  summary: ShipmentEtrogSummary;
  labels: ShipmentsTableLabels['detailsEtrogSummary'];
};

export function ShipmentEtrogSummaryTable({ summary, labels }: ShipmentEtrogSummaryTableProps): JSX.Element {
  const renderRow = (row: ShipmentEtrogSummaryRow) => (
    <tr key={row.key}>
      <td className={`shipment-details-print__row-label ${styles.detailsSummaryRowLabel}`}>{row.label}</td>
      {summary.pitamStatuses.map((status) => (
        <td key={status}>{row.counts[status].toLocaleString()}</td>
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
              {summary.pitamStatuses.map((status) => (
                <th key={status} scope="col">{labels.pitamStatusLabels[status]}</th>
              ))}
              <th scope="col">{labels.totalColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {summary.traderCategoryRows.map(renderRow)}
            {summary.customerCategoryRows.map(renderRow)}
            {summary.customRow ? renderRow(summary.customRow) : null}
          </tbody>
          <tfoot>
            <tr className={`shipment-details-print__row-total ${styles.detailsSummaryRowTotal}`}>
              <td>{labels.totalRowLabel}</td>
              {summary.pitamStatuses.map((status) => (
                <td key={status}>{summary.columnTotals[status].toLocaleString()}</td>
              ))}
              <td>{summary.grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
