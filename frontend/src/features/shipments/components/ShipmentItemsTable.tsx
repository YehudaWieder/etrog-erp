import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentItemsTableLabels, ShipmentItemsTableRow } from '../shipments.types';
import { useShipmentItemsFilters } from '../hooks/useShipmentItemsFilters';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildShipmentItemsSummaryTotals } from '../services/shipmentsSummary.service';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../services/shipmentDetailsPrintStyles';
import { printAllShipmentItems, exportAllShipmentItemsToExcel } from '../services/allShipmentItemsExport.service';
import { openPrintableWindow } from '../../../services/printWindow';
import sharedFilterStyles from '../../../components/ui/styles/GlobalFiltersBar.module.css';
import styles from './styles/AllShipmentsTable.module.css';

type ShipmentItemsTableProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  selectedItemId: number | null;
  onSelectItem: (row: ShipmentItemsTableRow | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function ShipmentItemsTable({ lang, labels, selectedItemId, onSelectItem, refreshKey, onRowCountChange, onSeasonInfoChange }: ShipmentItemsTableProps): JSX.Element {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedBoxNumber,
    selectedShipmentNumber,
    selectedOwnership,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useShipmentItemsFilters(labels);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const [detailsRow, setDetailsRow] = useState<ShipmentItemsTableRow | null>(null);
  const { rows, columns, isLoading, error } = useShipmentItemsTable(
    labels,
    selectedSeasonId,
    selectedBoxNumber,
    selectedShipmentNumber,
    selectedOwnership,
    refreshKey,
    setDetailsRow,
  );
  const summaryTotals = useMemo(() => buildShipmentItemsSummaryTotals(rows), [rows]);
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;
  const detailsPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintTable = useCallback(() => {
    printAllShipmentItems({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportAllShipmentItemsToExcel({ lang, labels, rows, filterDisplayValues });
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
      onRowCountChangeRef.current?.(rows.length);
    }
  }, [rows.length, isLoading]);

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
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
          { key: 'trader-general', label: labels.summary.traderAndGeneralQuantity, value: summaryTotals.traderAndGeneralQuantity },
          { key: 'customer', label: labels.summary.customerQuantity, value: summaryTotals.customerQuantity },
        ]}
      />

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items"
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
                      <strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber}
                    </p>
                    <p>
                      <strong>{labels.colCategory}:</strong> {detailsRow.category}
                    </p>
                    <p>
                      <strong>{labels.colOwnership}:</strong> {detailsRow.ownership}
                    </p>
                    <p>
                      <strong>{labels.colStockSource}:</strong>{' '}
                      {detailsRow.ownershipType === 'TRADER'
                        ? (detailsRow.isPrivateSelection
                            ? labels.stockSourceLabels.PRIVATE_SELECTION
                            : labels.stockSourceLabels.GENERAL)
                        : '—'}
                    </p>
                    <p>
                      <strong>{labels.colGrade}:</strong> {detailsRow.customGrade ?? detailsRow.grade ?? labels.noGrade}
                    </p>
                    <p>
                      <strong>{labels.colPitamStatus}:</strong>{' '}
                      {detailsRow.pitamStatus
                        ? (labels.pitamStatusLabels[detailsRow.pitamStatus] ?? detailsRow.pitamStatus)
                        : labels.noPitamStatus}
                    </p>
                    <p>
                      <strong>{labels.colQuantity}:</strong> {detailsRow.quantity.toLocaleString()}
                    </p>
                    <p>
                      <strong>{labels.detailsUpdatedByLabel}:</strong> {detailsRow.updatedByName}
                    </p>
                  </div>

                  {detailsRow.generalSourceBreakdown && detailsRow.generalSourceBreakdown.length > 0 ? (
                    <div className={`shipment-details-print__card-note ${styles.detailsCardNote}`}>
                      <strong>{labels.detailsGeneralSourceTitle}:</strong>
                      <ul style={{ margin: '4px 0 0', paddingInlineStart: '18px' }}>
                        {detailsRow.generalSourceBreakdown.map((entry, i) => (
                          <li key={i}>
                            {entry.traderName ?? labels.detailsGeneralSourceModuloLabel}: {entry.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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
