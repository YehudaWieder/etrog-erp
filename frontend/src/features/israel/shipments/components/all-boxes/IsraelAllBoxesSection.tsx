import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../../../../shipments/services/shipmentDetailsPrintStyles';
import { openPrintableWindow } from '../../../../../services/printWindow';
import type { IsraelBoxesTableRow } from '../../israelShipments.types';
import type { IsraelAllBoxesTableLabels } from '../../israelShipments.types';
import { useIsraelAllBoxesFilters } from '../../hooks/useIsraelAllBoxesFilters';
import { useIsraelAllBoxesTable } from '../../hooks/useIsraelAllBoxesTable';
import { useIsraelBoxDetailsItems } from '../../hooks/useIsraelBoxDetailsItems';
import { IsraelShipmentItemsDetailTable } from '../shared/IsraelShipmentItemsDetailTable';
import { buildIsraelShipmentItemDetailRows } from '../../services/israelShipmentItemsDetailRows.service';
import { printIsraelAllBoxes, exportIsraelAllBoxesToExcel } from '../../services/israelAllBoxesExport.service';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
import sharedDetailsStyles from '../../../../shipments/components/styles/AllShipmentsTable.module.css';
import styles from './IsraelAllBoxesSection.module.css';

type IsraelAllBoxesSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelAllBoxesTableLabels;
  selectedBoxIds: number[];
  onSelectBox: (row: IsraelBoxesTableRow | null) => void;
  onToggleBoxSelection: (row: IsraelBoxesTableRow) => void;
  onPruneSelection?: (validIds: Set<number>) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function IsraelAllBoxesSection({
  lang,
  labels,
  selectedBoxIds,
  onSelectBox,
  onToggleBoxSelection,
  onPruneSelection,
  refreshKey,
  onRowCountChange,
  onSeasonInfoChange,
}: IsraelAllBoxesSectionProps): JSX.Element {
  const [detailsRow, setDetailsRow] = useState<IsraelBoxesTableRow | null>(null);
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    selectedFieldId,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useIsraelAllBoxesFilters(labels);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const { rows, columns, isLoading, error } = useIsraelAllBoxesTable(
    labels,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    selectedFieldId,
    refreshKey,
    setDetailsRow,
  );
  const summaryTotals = useMemo(() => {
    const shipped = rows.filter((row) => row.status === 'SHIPPED' || row.status === 'DELIVERED').length;
    return { totalBoxes: rows.length, notShipped: rows.length - shipped, shipped };
  }, [rows]);

  const {
    items: detailsItems,
    isLoading: isDetailsItemsLoading,
    error: detailsItemsError,
  } = useIsraelBoxDetailsItems(detailsRow?.id ?? null, labels.detailsItemsError);
  const detailsItemsRows = useMemo(
    () => buildIsraelShipmentItemDetailRows(detailsItems, labels.detailsItemsTable),
    [detailsItems, labels.detailsItemsTable],
  );

  const detailsPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintTable = useCallback(() => {
    printIsraelAllBoxes({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportIsraelAllBoxesToExcel({ lang, labels, rows, filterDisplayValues });
    } catch {
      window.alert(labels.tableExportError);
    }
  }, [lang, labels, rows, filterDisplayValues]);

  const handlePrintDetails = () => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    const heading = labels.detailsPanelTitle(detailsRow?.boxNumber);
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
    if (selectedBoxIds.length === 0 || !onPruneSelection) {
      return;
    }

    const existingIds = new Set(rows.map((row) => row.id));
    const hasStaleSelection = selectedBoxIds.some((id) => !existingIds.has(id));
    if (hasStaleSelection) {
      onPruneSelection(existingIds);
    }
  }, [onPruneSelection, rows, selectedBoxIds]);

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
          { key: 'total-boxes', label: labels.summary.totalBoxes, value: summaryTotals.totalBoxes },
          { key: 'not-shipped', label: labels.summary.notShipped, value: summaryTotals.notShipped },
          { key: 'shipped', label: labels.summary.shipped, value: summaryTotals.shipped },
        ]}
      />

      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="israel-shipments-all-boxes"
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
          <GlobalDataTable<IsraelBoxesTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKeys={selectedBoxIds}
            onRowClick={isViewingNonActiveSeason ? undefined : onSelectBox}
            onToggleRowSelection={isViewingNonActiveSeason ? undefined : onToggleBoxSelection}
            selectionColumnLabel={labels.selectRowAriaLabel}
            defaultSortState={{ key: 'boxNumber', direction: 'asc' }}
          />

          <GlobalLeftDetailsPanel
            isOpen={detailsRow !== null}
            title={labels.detailsPanelTitle(detailsRow?.boxNumber)}
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
                      <strong>{labels.colField}:</strong> {detailsRow.fieldName}
                    </p>
                    <p>
                      <strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber ?? labels.unassignedShipmentLabel}
                    </p>
                    <p>
                      <strong>{labels.colStatus}:</strong> {labels.statusLabels[detailsRow.status]}
                    </p>
                    <p>
                      <strong>{labels.colItemsCount}:</strong> {detailsRow.itemsCount.toLocaleString()}
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

                {isDetailsItemsLoading ? (
                  <p className={sharedDetailsStyles.detailsSummaryState}>{labels.detailsItemsLoading}</p>
                ) : detailsItemsError ? (
                  <p className={`${sharedDetailsStyles.detailsSummaryState} ${sharedDetailsStyles.detailsSummaryStateError}`}>{detailsItemsError}</p>
                ) : detailsItemsRows.length === 0 ? (
                  <p className={sharedDetailsStyles.detailsSummaryState}>{labels.detailsItemsEmpty}</p>
                ) : (
                  <IsraelShipmentItemsDetailTable rows={detailsItemsRows} labels={labels.detailsItemsTable} showBoxNumber={false} />
                )}
              </div>
            ) : null}
          </GlobalLeftDetailsPanel>
        </div>
      )}
    </section>
  );
}
