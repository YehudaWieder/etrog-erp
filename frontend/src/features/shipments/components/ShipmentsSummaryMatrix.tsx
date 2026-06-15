import { useMemo } from 'react';
import type { ShipmentItemsSummaryMatrix, ShipmentSummaryBucket } from '../services/shipmentItemsSummaryMatrix.service';
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

  function renderBucketRow(label: string, bucket: ShipmentSummaryBucket) {
    return (
      <tr>
        <th className={styles.matrixTypeCell}>{label}</th>
        {matrix.shipmentNumbers.map((num) => (
          <td key={num}>{formatter.format(bucket.quantities[num] ?? 0)}</td>
        ))}
        <td className={styles.matrixTotalCell}>{formatter.format(bucket.total)}</td>
      </tr>
    );
  }

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
            <th className={styles.matrixTypeHead}>{sm.typeColumnLabel}</th>
            {matrix.shipmentNumbers.map((num) => (
              <th key={num}>{labels.colShipmentNumber} {num}</th>
            ))}
            <th className={styles.matrixTotalHead}>{labels.summary.total}</th>
          </tr>
        </thead>
        <tbody>
          {matrix.generalCategories.map(({ categoryName, bucket }) =>
            renderBucketRow(categoryName, bucket),
          )}
          {renderBucketRow(sm.privateSelectionLabel, matrix.privateSelection)}
          {renderBucketRow(sm.customersLabel, matrix.customers)}
        </tbody>
        <tfoot>
          <tr>
            <th className={styles.matrixTypeCell}>{sm.grandTotalLabel}</th>
            {matrix.shipmentNumbers.map((num) => (
              <td key={num}>{formatter.format(matrix.columnTotals[num] ?? 0)}</td>
            ))}
            <td className={styles.matrixTotalCell}>{formatter.format(matrix.grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    </div>
  );
}
