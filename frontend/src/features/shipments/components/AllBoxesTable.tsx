import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { BoxesTableLabels, BoxesTableRow } from '../shipments.types';
import { useAllBoxesFilters } from '../hooks/useAllBoxesFilters';
import { useAllBoxesTable } from '../hooks/useAllBoxesTable';
import { useBoxDetailsItems } from '../hooks/useBoxDetailsItems';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { ShipmentItemsDetailTable } from './ShipmentItemsDetailTable';
import { buildAllBoxesSummaryTotals } from '../services/shipmentsSummary.service';
import { buildBoxItemsDetailRows } from '../services/shipmentItemsDetailRows.service';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../services/shipmentDetailsPrintStyles';
import { printAllBoxes, exportAllBoxesToExcel } from '../services/allBoxesExport.service';
import { openPrintableWindow } from '../../../services/printWindow';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import sharedFilterStyles from '../../../components/ui/styles/GlobalFiltersBar.module.css';
import styles from './styles/AllShipmentsTable.module.css';

type AllBoxesTableProps = {
  lang: 'he' | 'en';
  labels: BoxesTableLabels;
  selectedBoxIds: number[];
  onSelectBox: (row: BoxesTableRow | null) => void;
  onToggleBoxSelection: (row: BoxesTableRow) => void;
  onPruneSelection?: (validIds: Set<number>) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
};

export function AllBoxesTable({ lang, labels, selectedBoxIds, onSelectBox, onToggleBoxSelection, onPruneSelection, refreshKey, onRowCountChange }: AllBoxesTableProps): JSX.Element {
  const {
    filters,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    selectedOwnership,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useAllBoxesFilters(labels);
  const [detailsRow, setDetailsRow] = useState<BoxesTableRow | null>(null);
  const { rows, columns, isLoading, error } = useAllBoxesTable(
    labels,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    selectedOwnership,
    refreshKey,
    setDetailsRow,
  );
  const summaryTotals = useMemo(() => buildAllBoxesSummaryTotals(rows), [rows]);
  const {
    items: detailsItems,
    isLoading: isDetailsItemsLoading,
    error: detailsItemsError,
  } = useBoxDetailsItems(detailsRow?.id ?? null, labels.detailsItemsError);
  const [traderCategoryOrder, setTraderCategoryOrder] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!selectedSeasonId) {
      setTraderCategoryOrder(new Map());
      return;
    }
    let isMounted = true;
    getTraderCategoriesWithShares(selectedSeasonId)
      .then((categories) => {
        if (!isMounted) return;
        const map = new Map<string, number>();
        for (const category of categories) {
          map.set(category.name, category.orderIndex);
        }
        setTraderCategoryOrder(map);
      })
      .catch(() => {
        if (isMounted) setTraderCategoryOrder(new Map());
      });
    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId]);
  const detailsItemsRows = useMemo(
    () => (detailsRow ? buildBoxItemsDetailRows(detailsItems, detailsRow.boxNumber, labels.detailsItemsTable, traderCategoryOrder) : []),
    [detailsItems, detailsRow, labels.detailsItemsTable, traderCategoryOrder],
  );
  const detailsPrintRef = useRef<HTMLDivElement>(null);
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;

  const handlePrintTable = useCallback(() => {
    printAllBoxes({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportAllBoxesToExcel({ lang, labels, rows, filterDisplayValues });
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
      onRowCountChangeRef.current?.(rows.length);
    }
  }, [rows.length, isLoading]);

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
        scope="shipments-all-boxes"
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
          <GlobalDataTable<BoxesTableRow>
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={labels.empty}
            selectedRowKeys={selectedBoxIds}
            onRowClick={onSelectBox}
            onToggleRowSelection={onToggleBoxSelection}
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
                      <strong>{labels.colShipmentNumber}:</strong> {detailsRow.shipmentNumber}
                    </p>
                    <p>
                      <strong>{labels.colBoxType}:</strong> {labels.boxTypeLabels[detailsRow.boxType] ?? detailsRow.boxType}
                    </p>
                    <p>
                      <strong>{labels.colStatus}:</strong> {labels.statusLabels[detailsRow.status]}
                    </p>
                    <p>
                      <strong>{labels.colOwnership}:</strong> {detailsRow.ownership}
                    </p>
                    <p>
                      <strong>{labels.colQuantity}:</strong> {detailsRow.totalQuantity.toLocaleString()}
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
                  <p className={styles.detailsSummaryState}>{labels.detailsItemsLoading}</p>
                ) : detailsItemsError ? (
                  <p className={`${styles.detailsSummaryState} ${styles.detailsSummaryStateError}`}>{detailsItemsError}</p>
                ) : detailsItemsRows.length === 0 ? (
                  <p className={styles.detailsSummaryState}>{labels.detailsItemsEmpty}</p>
                ) : (
                  <ShipmentItemsDetailTable rows={detailsItemsRows} labels={labels.detailsItemsTable} showBoxNumber={false} />
                )}
              </div>
            ) : null}
          </GlobalLeftDetailsPanel>
        </div>
      )}
    </section>
  );
}
