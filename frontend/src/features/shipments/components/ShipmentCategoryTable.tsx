import { useMemo } from 'react';
import type { CategoryMatrixData } from '../services/shipmentItemsCategoryMatrix.service';
import styles from './styles/ShipmentCategoryTable.module.css';

type ShipmentCategoryTableProps = {
  lang: 'he' | 'en';
  data: CategoryMatrixData;
  shipmentColumnLabel: string;
  totalLabel: string;
};

export function ShipmentCategoryTable({ lang, data, shipmentColumnLabel, totalLabel }: ShipmentCategoryTableProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <div className={styles.tableSection}>
      <h3 className={styles.tableTitle}>{data.categoryName}</h3>
      <div className={styles.matrixViewport}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixOwnershipHead}>{shipmentColumnLabel}</th>
              {data.ownerships.map((ownership) => (
                <th key={ownership}>{ownership}</th>
              ))}
              <th className={styles.matrixTotalHead}>{totalLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.shipmentNumbers.map((num) => (
              <tr key={num}>
                <th className={styles.matrixOwnershipCell}><strong>{num}</strong></th>
                {data.ownerships.map((ownership) => (
                  <td key={ownership}>{formatter.format(data.values[ownership]?.[num] ?? 0)}</td>
                ))}
                <td className={styles.matrixTotalCell}>{formatter.format(data.columnTotals[num] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className={styles.matrixOwnershipCell}>{totalLabel}</th>
              {data.ownerships.map((ownership) => (
                <td key={ownership}>{formatter.format(data.rowTotals[ownership] ?? 0)}</td>
              ))}
              <td className={styles.matrixTotalCell}>{formatter.format(data.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
