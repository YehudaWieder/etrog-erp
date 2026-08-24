import { useEffect, useMemo, useState } from 'react';
import { getIsraelShipmentItemsBySeason, type IsraelShipmentItemRecord } from '../../../../../services/israel/israelShipmentItemsApi';
import { getIsraelFields, type IsraelField } from '../../../../../services/israel/israelFieldsApi';
import { getIsraelSortCategories, type IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import { buildIsraelFieldCategoryMatrix } from '../../utils/israelFieldCategoryMatrix.util';
import type { IsraelShipmentItemsSummaryTableLabels } from '../../israelShipments.types';
import styles from '../../../../shipments/components/styles/ShipmentCategoryTable.module.css';

type IsraelFieldCategoryMatrixSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelShipmentItemsSummaryTableLabels;
  selectedSeasonId: number | null;
  selectedShipmentNumber?: 'all' | number;
  titleOverride?: string;
  refreshKey?: number;
};

export function IsraelFieldCategoryMatrixSection({
  lang,
  labels,
  selectedSeasonId,
  selectedShipmentNumber = 'all',
  titleOverride,
  refreshKey,
}: IsraelFieldCategoryMatrixSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const m = labels.fieldCategoryMatrix;
  const title = titleOverride ?? m.title;

  const [items, setItems] = useState<IsraelShipmentItemRecord[]>([]);
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [categories, setCategories] = useState<IsraelSortCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSeasonId) {
      setItems([]);
      setFields([]);
      setCategories([]);
      setIsLoading(false);
      setError('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    Promise.all([
      getIsraelShipmentItemsBySeason(selectedSeasonId),
      getIsraelFields(),
      getIsraelSortCategories(),
    ])
      .then(([nextItems, nextFields, nextCategories]) => {
        if (!isMounted) return;
        setItems(nextItems);
        setFields(nextFields);
        setCategories(nextCategories);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(labels.error);
        setItems([]);
        setFields([]);
        setCategories([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, refreshKey, labels.error]);

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories],
  );

  const rows = useMemo(
    () => buildIsraelFieldCategoryMatrix(items, fields, selectedShipmentNumber),
    [items, fields, selectedShipmentNumber],
  );

  const grandTotals = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    for (const category of orderedCategories) categoryTotals[String(category.id)] = 0;
    let totalQuantity = 0;
    let totalBoxes = 0;

    for (const row of rows) {
      for (const category of orderedCategories) {
        categoryTotals[String(category.id)] += row.categoryQuantities[String(category.id)] ?? 0;
      }
      totalQuantity += row.totalQuantity;
      totalBoxes += row.totalBoxes;
    }

    return { categoryTotals, totalQuantity, totalBoxes };
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

  if (rows.length === 0) {
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
              <th className={styles.matrixOwnershipHead}>{m.fieldColumn}</th>
              {orderedCategories.map((category) => (
                <th key={category.id}>{category.name}</th>
              ))}
              <th className={styles.matrixSubtotalCell}>{m.totalQuantityColumn}</th>
              <th className={styles.matrixTotalHead}>{m.totalBoxesColumn}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fieldId}>
                <th className={styles.matrixOwnershipCell}>{row.fieldName}</th>
                {orderedCategories.map((category) => (
                  <td key={category.id}>{formatter.format(row.categoryQuantities[String(category.id)] ?? 0)}</td>
                ))}
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
              <td className={styles.matrixSubtotalCell}>{formatter.format(grandTotals.totalQuantity)}</td>
              <td className={styles.matrixTotalCell}>{formatter.format(grandTotals.totalBoxes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
