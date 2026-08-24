import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import type { IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { IsraelAllShipmentsTableLabels } from '../../israelShipments.types';
import { useIsraelAllShipmentsFilters } from '../../hooks/useIsraelAllShipmentsFilters';
import { useIsraelAllShipmentsTable } from '../../hooks/useIsraelAllShipmentsTable';
import { formatIsraelShipmentDate } from '../../utils/israelShipments.util';
import styles from './IsraelAllShipmentsSection.module.css';

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type IsraelAllShipmentsSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelAllShipmentsTableLabels;
  selectedShipmentId: number | null;
  onSelectShipment: (row: IsraelShipmentRecord | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function IsraelAllShipmentsSection({
  lang,
  labels,
  selectedShipmentId,
  onSelectShipment,
  refreshKey,
  onRowCountChange,
  onSeasonInfoChange,
}: IsraelAllShipmentsSectionProps): JSX.Element {
  const {
    filters,
    seasons,
    activeSeasonId,
    selectedSeasonId,
    selectedStatus,
    selectedFieldId,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useIsraelAllShipmentsFilters(labels);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const [detailsRow, setDetailsRow] = useState<IsraelShipmentRecord | null>(null);
  const detailsSeasonName = useMemo(
    () => (detailsRow ? seasons.find((season) => season.id === detailsRow.seasonId)?.yearName ?? null : null),
    [detailsRow, seasons],
  );
  const { rows, columns, isLoading, error } = useIsraelAllShipmentsTable(
    labels,
    selectedSeasonId,
    selectedStatus,
    selectedFieldId,
    refreshKey,
    setDetailsRow,
  );
  const summaryTotals = useMemo(() => {
    let totalBoxes = 0;
    let totalQuantity = 0;
    for (const row of rows) {
      totalBoxes += toSafeNumber(row.totalBoxes);
      totalQuantity += toSafeNumber(row.totalQuantity);
    }
    return { totalShipments: rows.length, totalBoxes, totalQuantity };
  }, [rows]);

  useEffect(() => {
    if (!isLoading) {
      onRowCountChange?.(rows.length);
    }
  }, [rows.length, isLoading, onRowCountChange]);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  useEffect(() => {
    if (selectedShipmentId === null) {
      return;
    }

    const selectedExists = rows.some((row) => row.id === selectedShipmentId);
    if (!selectedExists) {
      onSelectShipment(null);
    }
  }, [onSelectShipment, rows, selectedShipmentId]);

  useEffect(() => {
    if (detailsRow === null) {
      return;
    }

    const detailsRowExists = rows.some((row) => row.id === detailsRow.id);
    if (!detailsRowExists) {
      setDetailsRow(null);
    }
  }, [detailsRow, rows]);

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
        scope="israel-shipments-all-shipments"
        filters={filters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
      />

      {error ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{error}</p>
      ) : isLoading ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{labels.loading}</p>
      ) : (
        <div className={styles.contentSection}>
          <GlobalDataTable<IsraelShipmentRecord>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKey={selectedShipmentId}
            onRowClick={isViewingNonActiveSeason ? undefined : onSelectShipment}
            defaultSortState={{ key: 'shipmentNumber', direction: 'asc' }}
          />

          <GlobalLeftDetailsPanel
            isOpen={detailsRow !== null}
            title={labels.detailsPanelTitle(detailsRow?.shipmentNumber)}
            closeLabel={labels.detailsPanelCloseLabel}
            onClose={() => setDetailsRow(null)}
          >
            {detailsRow ? (
              <div className={styles.detailsBody}>
                <div className={styles.detailsCard}>
                  <div className={styles.detailsCardHead}>
                    <p>
                      <strong>{labels.seasonFilterLabel}:</strong> {detailsSeasonName ?? '—'}
                    </p>
                    <p>
                      <strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber}
                    </p>
                    <p>
                      <strong>{labels.colField}:</strong> {detailsRow.field?.name ?? '—'}
                    </p>
                    <p>
                      <strong>{labels.statusFilterLabel}:</strong> {labels.statusLabels[detailsRow.status]}
                    </p>
                    <p>
                      <strong>{labels.colShippedAt}:</strong>{' '}
                      {detailsRow.shippedAt ? formatIsraelShipmentDate(new Date(detailsRow.shippedAt)) : '—'}
                    </p>
                    <p>
                      <strong>{labels.colBoxCount}:</strong> {detailsRow.totalBoxes}
                    </p>
                    <p>
                      <strong>{labels.colQuantity}:</strong> {detailsRow.totalQuantity.toLocaleString()}
                    </p>
                    <p>
                      <strong>{labels.detailsUpdatedByLabel}:</strong> {detailsRow.updatedBy?.name ?? '—'}
                    </p>
                  </div>

                  {detailsRow.notes ? (
                    <p className={styles.detailsCardNote}>
                      <strong>{labels.detailsNotesLabel}:</strong> {detailsRow.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </GlobalLeftDetailsPanel>
        </div>
      )}
    </section>
  );
}
