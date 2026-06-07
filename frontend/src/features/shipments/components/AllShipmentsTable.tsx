import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentRecord, ShipmentsTableLabels } from '../shipments.types';
import { useAllShipmentsFilters } from '../hooks/useAllShipmentsFilters';
import { useAllShipmentsTable } from '../hooks/useAllShipmentsTable';
import styles from './styles/AllShipmentsTable.module.css';

type AllShipmentsTableProps = {
  labels: ShipmentsTableLabels;
};

export function AllShipmentsTable({ labels }: AllShipmentsTableProps): JSX.Element {
  const {
    filters,
    selectedSeasonId,
    selectedStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useAllShipmentsFilters(labels);
  const { rows, columns, isLoading, error } = useAllShipmentsTable(labels, selectedSeasonId, selectedStatus);

  return (
    <section className={workspaceStyles.workspace}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={`${workspaceStyles.description} ${styles.description}`}>{labels.description}</p>
        </div>
      </header>

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
            defaultSortState={{ key: 'shipmentNumber', direction: 'desc' }}
          />
        </div>
      )}
    </section>
  );
}
