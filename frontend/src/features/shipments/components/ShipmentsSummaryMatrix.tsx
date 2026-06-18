import { useMemo } from 'react';
import type { ShipmentItemsSummaryMatrix } from '../services/shipmentItemsSummaryMatrix.service';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import styles from './styles/ShipmentsSummaryMatrix.module.css';

type ShipmentsSummaryMatrixProps = {
  lang: 'he' | 'en';
  matrix: ShipmentItemsSummaryMatrix;
  labels: ShipmentItemsTableLabels;
};

export function ShipmentsSummaryMatrix({ lang, matrix, labels }: ShipmentsSummaryMatrixProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const sm = labels.summaryMatrix;

  if (matrix.shipmentNumbers.length === 0) {
    return (
      <div className={styles.matrixSection}>
        <h3 className={styles.matrixTitle}>{sm.title}</h3>
        <p className={styles.emptyMessage}>{labels.empty}</p>
      </div>
    );
  }

  return (
    <div className={styles.matrixSection}>
      <h3 className={styles.matrixTitle}>{sm.title}</h3>
      <div className={styles.matrixViewport}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixTypeHead}>{labels.colShipmentNumber}</th>
              {matrix.generalCategories.map(({ categoryName }) => (
                <th key={categoryName}>{categoryName}</th>
              ))}
              <th>{sm.privateSelectionLabel}</th>
              <th>{sm.customersLabel}</th>
              <th className={styles.matrixTotalHead}>{labels.summary.total}</th>
            </tr>
          </thead>
          <tbody>
            {matrix.shipmentNumbers.map((num) => (
              <tr key={num}>
                <th className={styles.matrixTypeCell}><strong>{num}</strong></th>
                {matrix.generalCategories.map(({ categoryName, bucket }) => (
                  <td key={categoryName}>{formatter.format(bucket.quantities[num] ?? 0)}</td>
                ))}
                <td>{formatter.format(matrix.privateSelection.quantities[num] ?? 0)}</td>
                <td>{formatter.format(matrix.customers.quantities[num] ?? 0)}</td>
                <td className={styles.matrixTotalCell}>{formatter.format(matrix.columnTotals[num] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className={styles.matrixTypeCell}>{sm.grandTotalLabel}</th>
              {matrix.generalCategories.map(({ categoryName, bucket }) => (
                <td key={categoryName}>{formatter.format(bucket.total)}</td>
              ))}
              <td>{formatter.format(matrix.privateSelection.total)}</td>
              <td>{formatter.format(matrix.customers.total)}</td>
              <td className={styles.matrixTotalCell}>{formatter.format(matrix.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
