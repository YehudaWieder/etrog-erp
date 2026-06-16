import { useEffect, useMemo, useRef } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentRecord, ShipmentsTableLabels } from '../shipments.types';
import { useAllShipmentsFilters } from '../hooks/useAllShipmentsFilters';
import { useAllShipmentsTable } from '../hooks/useAllShipmentsTable';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildAllShipmentsSummaryTotals } from '../services/shipmentsSummary.service';
import styles from './styles/AllShipmentsTable.module.css';

type AllShipmentsTableProps = {
  lang: 'he' | 'en';
  labels: ShipmentsTableLabels;
  selectedShipmentId: number | null;
  onSelectShipment: (row: ShipmentRecord | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
};

export function AllShipmentsTable({ lang, labels, selectedShipmentId, onSelectShipment, refreshKey, onRowCountChange }: AllShipmentsTableProps): JSX.Element {
  const {
    filters,
    selectedSeasonId,
    selectedStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useAllShipmentsFilters(labels);
  const { rows, columns, isLoading, error } = useAllShipmentsTable(labels, selectedSeasonId, selectedStatus, refreshKey);
  const summaryTotals = useMemo(() => buildAllShipmentsSummaryTotals(rows), [rows]);
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;

  useEffect(() => {
    if (!isLoading) {
      onRowCountChangeRef.current?.(rows.length);
    }
  }, [rows.length, isLoading]);

  useEffect(() => {
    if (selectedShipmentId === null) {
      return;
    }

    const selectedExists = rows.some((row) => row.id === selectedShipmentId);
    if (!selectedExists) {
      onSelectShipment(null);
    }
  }, [onSelectShipment, rows, selectedShipmentId]);

  return (
    <section className={workspaceStyles.workspace}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={`${workspaceStyles.description} ${styles.description}`}>{labels.description}</p>
        </div>
      </header>

      <ShipmentsSummaryCards
        lang={lang}
        cards={[
          { key: 'total-shipments', label: labels.summary.totalShipments, value: summaryTotals.totalShipments },
          { key: 'total-boxes', label: labels.summary.totalBoxes, value: summaryTotals.totalBoxes },
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
        ]}
      />

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-all-shipments"
        filters={filters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
      />

      {error ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{error}</p>
      ) : isLoading ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{labels.loading}</p>
      ) : rows.length === 0 ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{labels.empty}</p>
      ) : (
        <div className={styles.contentSection}>
          <GlobalDataTable<ShipmentRecord>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKey={selectedShipmentId}
            onRowClick={onSelectShipment}
            defaultSortState={{ key: 'shipmentNumber', direction: 'desc' }}
          />
        </div>
      )}
    </section>
  );
}
