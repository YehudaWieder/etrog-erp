import { CategoryGradeMatrixTable } from '../../harvest/components/shared/CategoryGradeMatrixTable';
import type { ShipmentDetailedMatrices } from '../services/shipmentItemsDetailedMatrix.service';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import styles from './styles/ShipmentCategoryTable.module.css';

type ShipmentDetailedBreakdownTableProps = {
  lang: 'he' | 'en';
  data: ShipmentDetailedMatrices;
  labels: ShipmentItemsTableLabels;
};

export function ShipmentDetailedBreakdownTable({ lang, data, labels }: ShipmentDetailedBreakdownTableProps) {
  const columnLabels = {
    withPitam: labels.pitamStatusLabels.WITH_PITAM,
    withoutPitam: labels.pitamStatusLabels.WITHOUT_PITAM,
    mixed: labels.pitamStatusLabels.MIXED,
  };

  const groups = [
    { title: labels.ownershipLabels.GENERAL, matrix: data.general },
    { title: labels.summaryMatrix.privateSelectionTitle, matrix: data.privateSelection },
    { title: labels.summaryMatrix.customersTitle, matrix: data.customers },
  ].filter((group) => group.matrix.rows.length > 0);

  return (
    <div className={styles.tableSection}>
      <h3 className={styles.tableTitle}>
        {labels.summaryMatrix.shipmentLabel} {data.shipmentNumber}
      </h3>
      {groups.map((group) => (
        <div key={group.title} className={styles.tableSection}>
          <h4 className={styles.tableTitle}>{group.title}</h4>
          <CategoryGradeMatrixTable
            lang={lang}
            rows={group.matrix.rows}
            grades={group.matrix.grades}
            grandTotalRow={group.matrix.grandTotalRow}
            categoryColumnLabel={labels.colCategory}
            totalColumnLabel={labels.summary.total}
            emptyLabel={labels.empty}
            columnLabels={columnLabels}
          />
        </div>
      ))}
    </div>
  );
}
