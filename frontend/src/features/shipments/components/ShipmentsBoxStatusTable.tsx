import type { ShipmentRecord, ShipmentStatus } from '../shipments.types';
import styles from './styles/ShipmentCategoryTable.module.css';
import matrixStyles from './styles/ShipmentsSummaryMatrix.module.css';

type ShipmentsBoxStatusTableProps = {
  lang: 'he' | 'en';
  shipments: ShipmentRecord[];
  title: string;
  rowBoxesLabel: string;
  rowStatusLabel: string;
  shipmentColumnLabel: string;
  statusLabels: Record<ShipmentStatus, string>;
};

export function ShipmentsBoxStatusTable({
  shipments,
  title,
  rowBoxesLabel,
  rowStatusLabel,
  shipmentColumnLabel,
  statusLabels,
}: ShipmentsBoxStatusTableProps) {
  const sorted = [...shipments].sort((a, b) => a.shipmentNumber - b.shipmentNumber);

  return (
    <div style={{ marginTop: 8, marginBottom: 28 }}>
      <h3 className={matrixStyles.matrixTitle} style={{ marginBottom: 10 }}>{title}</h3>
      <div className={styles.matrixViewport}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixOwnershipHead} />
              {sorted.map((s) => (
                <th key={s.id}>{shipmentColumnLabel} {s.shipmentNumber}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={styles.matrixOwnershipCell}>{rowBoxesLabel}</th>
              {sorted.map((s) => (
                <td key={s.id}>{s.totalBoxes}</td>
              ))}
            </tr>
            <tr>
              <th className={styles.matrixOwnershipCell}>{rowStatusLabel}</th>
              {sorted.map((s) => (
                <td key={s.id}>{statusLabels[s.status]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
