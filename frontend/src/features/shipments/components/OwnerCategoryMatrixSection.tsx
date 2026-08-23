import { useEffect, useMemo, useState } from 'react';
import { getShipmentsOwnerCategorySummaryBySeason, type OwnerCategorySummaryRow } from '../../../services/shipmentsApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { ShipmentsTableLabels } from '../shipments.types';
import styles from './styles/ShipmentCategoryTable.module.css';

type OwnerCategoryMatrixSectionProps = {
  lang: 'he' | 'en';
  labels: ShipmentsTableLabels;
  selectedSeasonId: number | null;
  selectedShipmentNumber?: 'all' | number;
  titleOverride?: string;
  refreshKey?: number;
};

const UNCATEGORIZED_KEY = 'uncategorized';

export function OwnerCategoryMatrixSection({
  lang,
  labels,
  selectedSeasonId,
  selectedShipmentNumber = 'all',
  titleOverride,
  refreshKey,
}: OwnerCategoryMatrixSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const m = labels.ownerCategoryMatrix;
  const title = titleOverride ?? m.title;

  const [rows, setRows] = useState<OwnerCategorySummaryRow[]>([]);
  const [categories, setCategories] = useState<TraderCategoryWithShares[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSeasonId) {
      setRows([]);
      setCategories([]);
      setIsLoading(false);
      setError('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    Promise.all([
      getShipmentsOwnerCategorySummaryBySeason(
        selectedSeasonId,
        selectedShipmentNumber === 'all' ? undefined : selectedShipmentNumber,
      ),
      getTraderCategoriesWithShares(selectedSeasonId),
    ])
      .then(([nextRows, nextCategories]) => {
        if (!isMounted) return;
        setRows(nextRows);
        setCategories(nextCategories);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(labels.error);
        setRows([]);
        setCategories([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, selectedShipmentNumber, refreshKey, labels.error]);

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories],
  );

  const hasUncategorized = useMemo(
    () => rows.some((row) => (row.categoryQuantities[UNCATEGORIZED_KEY] ?? 0) > 0),
    [rows],
  );

  const sortedRows = useMemo(() => {
    const byName = (a: OwnerCategorySummaryRow, b: OwnerCategorySummaryRow) =>
      a.ownerName.localeCompare(b.ownerName, undefined, { sensitivity: 'base' });
    const traders = rows.filter((row) => row.ownerType === 'TRADER').sort(byName);
    const customers = rows.filter((row) => row.ownerType === 'CUSTOMER').sort(byName);
    return [...traders, ...customers];
  }, [rows]);

  const grandTotals = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    for (const category of orderedCategories) categoryTotals[String(category.id)] = 0;
    let uncategorized = 0;
    let privateSelection = 0;
    let customer = 0;
    let totalQuantity = 0;
    let totalBoxes = 0;

    for (const row of rows) {
      for (const category of orderedCategories) {
        categoryTotals[String(category.id)] += row.categoryQuantities[String(category.id)] ?? 0;
      }
      uncategorized += row.categoryQuantities[UNCATEGORIZED_KEY] ?? 0;
      privateSelection += row.privateSelectionQuantity;
      customer += row.customerQuantity;
      totalQuantity += row.totalQuantity;
      totalBoxes += row.totalBoxes;
    }

    return { categoryTotals, uncategorized, privateSelection, customer, totalQuantity, totalBoxes };
  }, [rows, orderedCategories]);

  if (isLoading) {
    return (
      <div className={styles.tableSection}>
        <h3 className={styles.tableTitle}>{title}</h3>
        <p>{labels.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tableSection}>
        <h3 className={styles.tableTitle}>{title}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <div className={styles.tableSection}>
        <h3 className={styles.tableTitle}>{title}</h3>
        <p>{m.empty}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableSection}>
      <h3 className={styles.tableTitle}>{title}</h3>
      <div className={styles.matrixViewport}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixOwnershipHead}>{m.ownerColumn}</th>
              {orderedCategories.map((category) => (
                <th key={category.id}>{category.name}</th>
              ))}
              {hasUncategorized ? <th>{m.uncategorizedColumn}</th> : null}
              <th>{m.privateSelectionColumn}</th>
              <th>{m.customerColumn}</th>
              <th className={styles.matrixSubtotalCell}>{m.totalQuantityColumn}</th>
              <th className={styles.matrixTotalHead}>{m.totalBoxesColumn}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={`${row.ownerType}-${row.ownerId}`}>
                <th className={styles.matrixOwnershipCell}>{row.ownerName}</th>
                {orderedCategories.map((category) => (
                  <td key={category.id}>{formatter.format(row.categoryQuantities[String(category.id)] ?? 0)}</td>
                ))}
                {hasUncategorized ? <td>{formatter.format(row.categoryQuantities[UNCATEGORIZED_KEY] ?? 0)}</td> : null}
                <td>{formatter.format(row.privateSelectionQuantity)}</td>
                <td>{formatter.format(row.customerQuantity)}</td>
                <td className={styles.matrixSubtotalCell}>{formatter.format(row.totalQuantity)}</td>
                <td className={styles.matrixTotalCell}>{formatter.format(row.totalBoxes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className={styles.matrixOwnershipCell}>{m.grandTotalLabel}</th>
              {orderedCategories.map((category) => (
                <td key={category.id}>{formatter.format(grandTotals.categoryTotals[String(category.id)] ?? 0)}</td>
              ))}
              {hasUncategorized ? <td>{formatter.format(grandTotals.uncategorized)}</td> : null}
              <td>{formatter.format(grandTotals.privateSelection)}</td>
              <td>{formatter.format(grandTotals.customer)}</td>
              <td className={styles.matrixSubtotalCell}>{formatter.format(grandTotals.totalQuantity)}</td>
              <td className={styles.matrixTotalCell}>{formatter.format(grandTotals.totalBoxes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
