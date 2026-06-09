import { useEffect, useMemo } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { BoxesTableLabels, BoxesTableRow } from '../shipments.types';
import { useAllBoxesFilters } from '../hooks/useAllBoxesFilters';
import { useAllBoxesTable } from '../hooks/useAllBoxesTable';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildAllBoxesSummaryTotals } from '../services/shipmentsSummary.service';
import styles from './styles/AllShipmentsTable.module.css';

type AllBoxesTableProps = {
  lang: 'he' | 'en';
  labels: BoxesTableLabels;
  selectedBoxId: number | null;
  onSelectBox: (row: BoxesTableRow | null) => void;
};

export function AllBoxesTable({ lang, labels, selectedBoxId, onSelectBox }: AllBoxesTableProps): JSX.Element {
  const {
    filters,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedStatus,
    selectedOwnership,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useAllBoxesFilters(labels);
  const { rows, columns, isLoading, error } = useAllBoxesTable(
    labels,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedStatus,
    selectedOwnership,
  );
  const summaryTotals = useMemo(() => buildAllBoxesSummaryTotals(rows), [rows]);

  useEffect(() => {
    if (selectedBoxId === null) {
      return;
    }

    const selectedExists = rows.some((row) => row.id === selectedBoxId);
    if (!selectedExists) {
      onSelectBox(null);
    }
  }, [onSelectBox, rows, selectedBoxId]);

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
          { key: 'total-boxes', label: labels.summary.totalBoxes, value: summaryTotals.totalBoxes },
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
          { key: 'total-shipments', label: labels.summary.totalShipments, value: summaryTotals.totalShipments },
        ]}
      />

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-all-boxes"
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
          <GlobalDataTable<BoxesTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKey={selectedBoxId}
            onRowClick={onSelectBox}
            defaultSortState={{ key: 'boxNumber', direction: 'desc' }}
          />
        </div>
      )}
    </section>
  );
}
