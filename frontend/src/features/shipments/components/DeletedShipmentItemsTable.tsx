import { useCallback, useEffect, useRef, useState } from 'react';
import { FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentItemsTableLabels, ShipmentItemsTableRow } from '../shipments.types';
import { useDeletedShipmentItemsFilters } from '../hooks/useDeletedShipmentItemsFilters';
import type { DeletedShipmentItemRecord } from '../../../services/shipmentItemsApi';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../services/shipmentDetailsPrintStyles';
import { openPrintableWindow } from '../../../services/printWindow';
import styles from './styles/AllShipmentsTable.module.css';

type DeletedShipmentItemsTableProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  selectedItemId: number | null;
  onSelectItem: (row: ShipmentItemsTableRow | null) => void;
  onRawItemSelect?: (item: DeletedShipmentItemRecord | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function DeletedShipmentItemsTable({ lang, labels, selectedItemId, onSelectItem, onRawItemSelect, refreshKey, onRowCountChange, onSeasonInfoChange }: DeletedShipmentItemsTableProps): JSX.Element {
  const [detailsRow, setDetailsRow] = useState<ShipmentItemsTableRow | null>(null);
  const {
    rows,
    rawItems,
    columns,
    filters,
    activeSeasonId,
    selectedSeasonId,
    isLoading,
    error,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useDeletedShipmentItemsFilters(labels, refreshKey, setDetailsRow);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;
  const detailsPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintDetails = useCallback(() => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) return;
    const heading = labels.detailsPanelTitle(detailsRow?.id);
    openPrintableWindow({
      title: heading,
      heading,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      html: printableNode.outerHTML,
      extraStyles: SHIPMENT_DETAILS_PRINT_EXTRA_STYLES,
    });
  }, [lang, labels, detailsRow?.id]);

  useEffect(() => {
    if (!isLoading) onRowCountChangeRef.current?.(rows.length);
  }, [rows.length, isLoading]);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  useEffect(() => {
    if (selectedItemId === null) return;
    if (!rows.some((row) => row.id === selectedItemId)) onSelectItem(null);
  }, [onSelectItem, rows, selectedItemId]);

  useEffect(() => {
    if (detailsRow === null) return;
    if (!rows.some((row) => row.id === detailsRow.id)) setDetailsRow(null);
  }, [detailsRow, rows]);

  return (
    <section className={workspaceStyles.workspace}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={`${workspaceStyles.description} ${styles.description}`}>{labels.trashDescription}</p>
        </div>
      </header>

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items-trash"
        filters={filters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
      />

      {error ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{error}</p>
      ) : isLoading ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{labels.loading}</p>
      ) : rows.length === 0 ? (
        <p className={`${styles.stateMessage} ${styles.contentSection}`}>{labels.trashEmpty}</p>
      ) : (
        <div className={styles.contentSection}>
          <GlobalDataTable<ShipmentItemsTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.trashEmpty}
            selectedRowKey={selectedItemId}
            onRowClick={isViewingNonActiveSeason ? undefined : (row) => {
              onSelectItem(row);
              onRawItemSelect?.(row ? (rawItems.find((r) => r.id === row.id) ?? null) : null);
            }}
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
                    <p><strong>{labels.colBoxNumber}:</strong> {detailsRow.boxNumber}</p>
                    <p><strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber}</p>
                    <p><strong>{labels.colCategory}:</strong> {detailsRow.category}</p>
                    <p><strong>{labels.colOwnership}:</strong> {detailsRow.ownership}</p>
                    <p>
                      <strong>{labels.colStockSource}:</strong>{' '}
                      {detailsRow.ownershipType === 'TRADER'
                        ? (detailsRow.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
                        : '—'}
                    </p>
                    <p><strong>{labels.colGrade}:</strong> {detailsRow.customGrade ?? detailsRow.grade ?? labels.noGrade}</p>
                    <p>
                      <strong>{labels.colPitamStatus}:</strong>{' '}
                      {detailsRow.pitamStatus ? (labels.pitamStatusLabels[detailsRow.pitamStatus] ?? detailsRow.pitamStatus) : labels.noPitamStatus}
                    </p>
                    <p><strong>{labels.colQuantity}:</strong> {detailsRow.quantity.toLocaleString()}</p>
                    <p><strong>{labels.detailsUpdatedByLabel}:</strong> {detailsRow.updatedByName}</p>
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
