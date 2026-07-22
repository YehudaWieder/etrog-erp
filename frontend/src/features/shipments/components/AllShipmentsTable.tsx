import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable } from '../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../components/ui/GlobalLeftDetailsPanel';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import type { ShipmentRecord, ShipmentsTableLabels } from '../shipments.types';
import { useAllShipmentsFilters } from '../hooks/useAllShipmentsFilters';
import { useAllShipmentsTable } from '../hooks/useAllShipmentsTable';
import { useShipmentDetailsBoxes } from '../hooks/useShipmentDetailsBoxes';
import { useShipmentDetailsItems } from '../hooks/useShipmentDetailsItems';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { ShipmentBoxesSummaryTable } from './ShipmentBoxesSummaryTable';
import { ShipmentEtrogSummaryTable } from './ShipmentEtrogSummaryTable';
import { ShipmentItemsDetailTable } from './ShipmentItemsDetailTable';
import { buildAllShipmentsSummaryTotals } from '../services/shipmentsSummary.service';
import { buildShipmentBoxesSummary } from '../services/shipmentBoxesSummary.service';
import { buildShipmentEtrogSummary } from '../services/shipmentEtrogSummary.service';
import { buildShipmentItemsDetailRows } from '../services/shipmentItemsDetailRows.service';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from '../services/shipmentDetailsPrintStyles';
import { printAllShipments, exportAllShipmentsToExcel } from '../services/allShipmentsExport.service';
import { openPrintableWindow } from '../../../services/printWindow';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import { formatShipmentDate } from '../utils/shipments.util';
import sharedFilterStyles from '../../../components/ui/styles/GlobalFiltersBar.module.css';
import styles from './styles/AllShipmentsTable.module.css';

type AllShipmentsTableProps = {
  lang: 'he' | 'en';
  labels: ShipmentsTableLabels;
  selectedShipmentId: number | null;
  onSelectShipment: (row: ShipmentRecord | null) => void;
  refreshKey?: number;
  onRowCountChange?: (count: number) => void;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function AllShipmentsTable({ lang, labels, selectedShipmentId, onSelectShipment, refreshKey, onRowCountChange, onSeasonInfoChange }: AllShipmentsTableProps): JSX.Element {
  const {
    filters,
    seasons,
    activeSeasonId,
    selectedSeasonId,
    selectedStatus,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useAllShipmentsFilters(labels);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const [detailsRow, setDetailsRow] = useState<ShipmentRecord | null>(null);
  const detailsSeasonName = useMemo(
    () => (detailsRow ? seasons.find((season) => season.id === detailsRow.seasonId)?.yearName ?? null : null),
    [detailsRow, seasons],
  );
  const { rows, columns, isLoading, error } = useAllShipmentsTable(labels, selectedSeasonId, selectedStatus, refreshKey, setDetailsRow);
  const summaryTotals = useMemo(() => buildAllShipmentsSummaryTotals(rows), [rows]);
  const {
    boxes: detailsBoxes,
    isLoading: isDetailsBoxesLoading,
    error: detailsBoxesError,
  } = useShipmentDetailsBoxes(detailsRow?.id ?? null, labels.detailsBoxesSummary.error);
  const detailsBoxesSummary = useMemo(
    () => buildShipmentBoxesSummary(
      detailsBoxes,
      labels.detailsBoxesSummary.generalRowLabel,
      labels.detailsBoxesSummary.customRowLabel,
    ),
    [detailsBoxes, labels.detailsBoxesSummary.customRowLabel, labels.detailsBoxesSummary.generalRowLabel],
  );
  const {
    items: detailsItems,
    isLoading: isDetailsItemsLoading,
    error: detailsItemsError,
  } = useShipmentDetailsItems(detailsBoxes, !isDetailsBoxesLoading, labels.detailsEtrogSummary.error);
  const [detailsTraderCategoryOrder, setDetailsTraderCategoryOrder] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const seasonId = detailsRow?.seasonId ?? null;
    if (!seasonId) {
      setDetailsTraderCategoryOrder(new Map());
      return;
    }
    let isMounted = true;
    getTraderCategoriesWithShares(seasonId)
      .then((categories) => {
        if (!isMounted) return;
        const map = new Map<string, number>();
        for (const category of categories) {
          map.set(category.name, category.orderIndex);
        }
        setDetailsTraderCategoryOrder(map);
      })
      .catch(() => {
        if (isMounted) setDetailsTraderCategoryOrder(new Map());
      });
    return () => {
      isMounted = false;
    };
  }, [detailsRow]);
  const detailsEtrogSummary = useMemo(
    () => buildShipmentEtrogSummary(detailsItems, labels.detailsEtrogSummary.customRowLabel, detailsTraderCategoryOrder),
    [detailsItems, labels.detailsEtrogSummary.customRowLabel, detailsTraderCategoryOrder],
  );
  const detailsItemsRows = useMemo(
    () => buildShipmentItemsDetailRows(detailsItems, detailsBoxes, labels.detailsItemsTable),
    [detailsItems, detailsBoxes, labels.detailsItemsTable],
  );
  const detailsPrintRef = useRef<HTMLDivElement>(null);
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;

  const handlePrintTable = useCallback(() => {
    printAllShipments({ lang, labels, rows, filterDisplayValues });
  }, [lang, labels, rows, filterDisplayValues]);

  const handleExportTable = useCallback(async () => {
    try {
      await exportAllShipmentsToExcel({ lang, labels, rows, filterDisplayValues });
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
      onRowCountChangeRef.current?.(rows.length);
    }
  }, [rows.length, isLoading]);

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
        scope="shipments-all-shipments"
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
          <GlobalDataTable<ShipmentRecord>
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
                      <strong>{labels.statusFilterLabel}:</strong> {labels.statusLabels[detailsRow.status]}
                    </p>
                    <p>
                      <strong>{labels.colShippedAt}:</strong>{' '}
                      {detailsRow.shippedAt ? formatShipmentDate(new Date(detailsRow.shippedAt)) : '—'}
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

                {isDetailsBoxesLoading ? (
                  <p className={styles.detailsSummaryState}>{labels.detailsBoxesSummary.loading}</p>
                ) : detailsBoxesError ? (
                  <p className={`${styles.detailsSummaryState} ${styles.detailsSummaryStateError}`}>{detailsBoxesError}</p>
                ) : detailsBoxes.length === 0 ? (
                  <p className={styles.detailsSummaryState}>{labels.detailsBoxesSummary.empty}</p>
                ) : (
                  <ShipmentBoxesSummaryTable summary={detailsBoxesSummary} labels={labels.detailsBoxesSummary} />
                )}

                {isDetailsItemsLoading ? (
                  <p className={styles.detailsSummaryState}>{labels.detailsEtrogSummary.loading}</p>
                ) : detailsItemsError ? (
                  <p className={`${styles.detailsSummaryState} ${styles.detailsSummaryStateError}`}>{detailsItemsError}</p>
                ) : detailsItems.length === 0 ? (
                  <p className={styles.detailsSummaryState}>{labels.detailsEtrogSummary.empty}</p>
                ) : (
                  <>
                    <ShipmentEtrogSummaryTable summary={detailsEtrogSummary} labels={labels.detailsEtrogSummary} />
                    <ShipmentItemsDetailTable rows={detailsItemsRows} labels={labels.detailsItemsTable} />
                  </>
                )}
              </div>
            ) : null}
          </GlobalLeftDetailsPanel>
        </div>
      )}
    </section>
  );
}
