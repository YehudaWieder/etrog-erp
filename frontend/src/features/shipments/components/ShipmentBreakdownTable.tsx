import { useMemo } from 'react';
import type { ShipmentBreakdownMatrix } from '../services/shipmentItemsCategoryMatrix.service';
import styles from './styles/ShipmentCategoryTable.module.css';

type ShipmentBreakdownTableProps = {
  lang: 'he' | 'en';
  data: ShipmentBreakdownMatrix;
  shipmentLabel: string;
  ownerColumnLabel: string;
  privateSelectionLabel: string;
  customersLabel: string;
  totalLabel: string;
};

export function ShipmentBreakdownTable({
  lang,
  data,
  shipmentLabel,
  ownerColumnLabel,
  privateSelectionLabel,
  customersLabel,
  totalLabel,
}: ShipmentBreakdownTableProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const getColLabel = (colKey: string) => {
    if (colKey === 'privateSelection') return privateSelectionLabel;
    if (colKey === 'customers') return customersLabel;
    return colKey;
  };

  return (
    <div className={styles.tableSection}>
      <h3 className={styles.tableTitle}>{shipmentLabel} {data.shipmentNumber}</h3>
      <div className={styles.matrixViewport}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixOwnershipHead}>{ownerColumnLabel}</th>
              {data.columnKeys.map((colKey) => (
                <th key={colKey}>{getColLabel(colKey)}</th>
              ))}
              <th className={styles.matrixTotalHead}>{totalLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.ownershipNames.map((name) => (
              <tr key={name}>
                <th className={styles.matrixOwnershipCell}><strong>{name}</strong></th>
                {data.columnKeys.map((colKey) => (
                  <td key={colKey}>{formatter.format(data.values[name]?.[colKey] ?? 0)}</td>
                ))}
                <td className={styles.matrixTotalCell}>{formatter.format(data.rowTotals[name] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className={styles.matrixOwnershipCell}>{totalLabel}</th>
              {data.columnKeys.map((colKey) => (
                <td key={colKey}>{formatter.format(data.columnTotals[colKey] ?? 0)}</td>
              ))}
              <td className={styles.matrixTotalCell}>{formatter.format(data.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
