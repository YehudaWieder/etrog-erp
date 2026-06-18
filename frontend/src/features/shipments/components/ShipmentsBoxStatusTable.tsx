import type { ShipmentRecord, ShipmentStatus } from '../shipments.types';
import { resolveShipmentStatusClass } from '../utils/shipments.util';
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
      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className={styles.matrixViewport} style={{ width: 'fit-content', maxWidth: '100%', minWidth: 360 }}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th>{shipmentColumnLabel}</th>
              <th>{rowBoxesLabel}</th>
              <th>{rowStatusLabel}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.shipmentNumber}</strong></td>
                <td>{s.totalBoxes}</td>
                <td>
                  <span className={`shipments-status-badge shipments-status-badge--${resolveShipmentStatusClass(s.status)}`}>
                    {statusLabels[s.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
