import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../../../../shipments/services/shipmentDetailsPrintStyles';
import { openPrintableWindow } from '../../../../../services/printWindow';
import type { IsraelShipmentItemsTableLabels, IsraelShipmentItemsTableRow } from '../../israelShipments.types';
import { useIsraelShipmentItemsFilters } from '../../hooks/useIsraelShipmentItemsFilters';
import { useIsraelShipmentItemsTable } from '../../hooks/useIsraelShipmentItemsTable';
import { printIsraelShipmentItems, exportIsraelShipmentItemsToExcel } from '../../services/israelShipmentItemsExport.service';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
import styles from './IsraelShipmentItemsSection.module.css';

type IsraelShipmentItemsSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelShipmentItemsTableLabels;
  selectedItemId: number | null;
  onSelectItem: (row: IsraelShipmentItemsTableRow | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function IsraelShipmentItemsSection({
  lang,
  labels,
  selectedItemId,
  onSelectItem,
  refreshKey,
  onRowCountChange,
  onSeasonInfoChange,
}: IsraelShipmentItemsSectionProps): JSX.Element {
  const [detailsRow, setDetailsRow] = useState<IsraelShipmentItemsTableRow | null>(null);
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedFieldId,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useIsraelShipmentItemsFilters(labels);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const { rows, columns, isLoading, error } = useIsraelShipmentItemsTable(
    labels,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedFieldId,
    refreshKey,
    setDetailsRow,
  );
  const summaryTotals = useMemo(() => {
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    return { totalItems: rows.length, totalQuantity };
  }, [rows]);

  const detailsPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintTable = useCallback(() => {
    printIsraelShipmentItems({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportIsraelShipmentItemsToExcel({ lang, labels, rows, filterDisplayValues });
    } catch {
      window.alert(labels.tableExportError);
    }
  }, [lang, labels, rows, filterDisplayValues]);

  const handlePrintDetails = () => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    const heading = labels.detailsPanelTitle(detailsRow?.id);
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
    if (selectedItemId === null) {
      return;
    }

    const selectedExists = rows.some((row) => row.id === selectedItemId);
    if (!selectedExists) {
      onSelectItem(null);
    }
  }, [onSelectItem, rows, selectedItemId]);

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
          { key: 'total-boxes', label: labels.summary.totalItems, value: summaryTotals.totalItems },
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
        ]}
      />

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="israel-shipments-items"
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
          <GlobalDataTable<IsraelShipmentItemsTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKey={selectedItemId}
            onRowClick={isViewingNonActiveSeason ? undefined : onSelectItem}
            defaultSortState={{ key: 'boxNumber', direction: 'desc' }}
          />

          <GlobalLeftDetailsPanel
            isOpen={detailsRow !== null}
            title={labels.detailsPanelTitle(detailsRow?.id)}
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
                      <strong>{labels.colBoxNumber}:</strong> {detailsRow.boxNumber}
                    </p>
                    <p>
                      <strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber ?? labels.unassignedShipmentLabel}
                    </p>
                    <p>
                      <strong>{labels.colCategory}:</strong> {detailsRow.category}
                    </p>
                    <p>
                      <strong>{labels.colGrade}:</strong> {detailsRow.grade}
                    </p>
                    <p>
                      <strong>{labels.colPitamStatus}:</strong> {labels.pitamStatusLabels[detailsRow.pitamStatus]}
                    </p>
                    <p>
                      <strong>{labels.colQuantity}:</strong> {detailsRow.quantity.toLocaleString()}
                    </p>
                    <p>
                      <strong>{labels.detailsUpdatedByLabel}:</strong> {detailsRow.updatedByName}
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
