import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../../../../shipments/services/shipmentDetailsPrintStyles';
import { openPrintableWindow } from '../../../../../services/printWindow';
import type { IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { IsraelAllShipmentsTableLabels } from '../../israelShipments.types';
import { useIsraelAllShipmentsFilters } from '../../hooks/useIsraelAllShipmentsFilters';
import { useIsraelAllShipmentsTable } from '../../hooks/useIsraelAllShipmentsTable';
import { formatIsraelShipmentDate } from '../../utils/israelShipments.util';
import { printIsraelAllShipments, exportIsraelAllShipmentsToExcel } from '../../services/israelAllShipmentsExport.service';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
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
    filterDisplayValues,
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

  const detailsPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintTable = useCallback(() => {
    printIsraelAllShipments({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportIsraelAllShipmentsToExcel({ lang, labels, rows, filterDisplayValues });
    } catch {
      window.alert(labels.tableExportError);
    }
  }, [lang, labels, rows, filterDisplayValues]);

  const handlePrintDetails = () => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    const heading = labels.detailsPanelTitle(detailsRow?.shipmentNumber);
    openPrintableWindow({
      title: heading,
      heading,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      html: printableNode.outerHTML,
      extraStyles: SHIPMENT_DETAILS_PRINT_EXTRA_STYLES,
    });
  };

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
        actions={rows.length > 0 ? (
          <div className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`} aria-label={labels.tableActionsLabel}>
            <button
              type="button"
              className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
              onClick={handlePrintTable}
              aria-label={labels.tablePrintAriaLabel}
              title={labels.tablePrintTitle}
            >
              <FaPrint />
            </button>
            <button
              type="button"
              className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
              onClick={() => { void handleExportTable(); }}
              aria-label={labels.tableExportAriaLabel}
              title={labels.tableExportTitle}
            >
              <FaFileArrowDown />
            </button>
          </div>
        ) : undefined}
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
            headerActions={
              <button
                type="button"
                className="global-left-details-panel__print"
                onClick={handlePrintDetails}
              >
                <FaPrint aria-hidden="true" />
                <span>{labels.detailsPrintLabel}</span>
              </button>
            }
          >
            {detailsRow ? (
              <div ref={detailsPrintRef} className={`shipment-details-print__content ${styles.detailsBody}`}>
                <div className={`shipment-details-print__card ${styles.detailsCard}`}>
                  <div className={`shipment-details-print__card-head ${styles.detailsCardHead}`}>
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
                    <p className={`shipment-details-print__card-note ${styles.detailsCardNote}`}>
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
