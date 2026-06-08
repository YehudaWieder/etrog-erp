import { useEffect } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentItemsTableLabels, ShipmentItemsTableRow } from '../shipments.types';
import { useShipmentItemsFilters } from '../hooks/useShipmentItemsFilters';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentItemsTableProps = {
  labels: ShipmentItemsTableLabels;
  selectedItemId: number | null;
  onSelectItem: (row: ShipmentItemsTableRow | null) => void;
};

export function ShipmentItemsTable({ labels, selectedItemId, onSelectItem }: ShipmentItemsTableProps): JSX.Element {
  const {
    filters,
    selectedSeasonId,
    selectedBoxNumber,
    selectedShipmentNumber,
    selectedOwnership,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useShipmentItemsFilters(labels);
  const { rows, columns, isLoading, error } = useShipmentItemsTable(
    labels,
    selectedSeasonId,
    selectedBoxNumber,
    selectedShipmentNumber,
    selectedOwnership,
  );

  useEffect(() => {
    if (selectedItemId === null) {
      return;
    }

    const selectedExists = rows.some((row) => row.id === selectedItemId);
    if (!selectedExists) {
      onSelectItem(null);
    }
  }, [onSelectItem, rows, selectedItemId]);

  return (
    <section className={workspaceStyles.workspace}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={`${workspaceStyles.description} ${styles.description}`}>{labels.description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items"
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
          <GlobalDataTable<ShipmentItemsTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKey={selectedItemId}
            onRowClick={onSelectItem}
            defaultSortState={{ key: 'boxNumber', direction: 'desc' }}
          />
        </div>
      )}
    </section>
  );
}
