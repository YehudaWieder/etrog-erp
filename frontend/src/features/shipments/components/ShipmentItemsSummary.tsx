import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildShipmentItemsSummaryTotals } from '../services/shipmentsSummary.service';
import { buildShipmentItemsPerShipmentMatrices } from '../services/shipmentItemsCategoryMatrix.service';
import { buildShipmentItemsSummaryMatrix } from '../services/shipmentItemsSummaryMatrix.service';
import { printShipmentsSummary, exportShipmentsSummaryToExcel } from '../services/shipmentItemsSummaryExport.service';
import { useShipmentItemsFilters } from '../hooks/useShipmentItemsFilters';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import { ShipmentBreakdownTable } from './ShipmentBreakdownTable';
import { ShipmentsSummaryMatrix } from './ShipmentsSummaryMatrix';
import { ShipmentsBoxStatusTable } from './ShipmentsBoxStatusTable';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import type { ShipmentItemsTableLabels, ShipmentRecord } from '../shipments.types';
import sharedFilterStyles from '../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './styles/ShipmentItemsSummary.module.css';

type ShipmentItemsSummaryProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  description: string;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function ShipmentItemsSummary({ lang, labels, description, refreshKey, onSeasonInfoChange }: ShipmentItemsSummaryProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedOwnership,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useShipmentItemsFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const summaryFilters = useMemo(
    () => filters.filter((f) => f.key === 'seasonId' || f.key === 'ownership'),
    [filters],
  );

  const { rows, isLoading, error } = useShipmentItemsTable(
    labels,
    selectedSeasonId,
    'all',
    'all',
    selectedOwnership,
    refreshKey,
  );

  const [traderCategoryOrder, setTraderCategoryOrder] = useState<Map<string, number>>(new Map());

  const summaryTotals = useMemo(() => buildShipmentItemsSummaryTotals(rows), [rows]);
  const summaryMatrix = useMemo(
    () => buildShipmentItemsSummaryMatrix(rows, traderCategoryOrder),
    [rows, traderCategoryOrder],
  );
  const perShipmentMatrices = useMemo(
    () => buildShipmentItemsPerShipmentMatrices(rows, traderCategoryOrder),
    [rows, traderCategoryOrder],
  );
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);

  const hasData = summaryMatrix.shipmentNumbers.length > 0;

  const handlePrint = useCallback(() => {
    printShipmentsSummary({ lang, labels, summaryMatrix, shipments, perShipmentMatrices, filterDisplayValues });
  }, [lang, labels, summaryMatrix, shipments, perShipmentMatrices, filterDisplayValues]);

  const handleExport = useCallback(async () => {
    try {
      await exportShipmentsSummaryToExcel({ lang, labels, summaryMatrix, shipments, perShipmentMatrices, filterDisplayValues });
    } catch {
      window.alert(labels.summaryExportError);
    }
  }, [lang, labels, summaryMatrix, shipments, perShipmentMatrices, filterDisplayValues]);

  useEffect(() => {
    if (!selectedSeasonId) {
      setShipments([]);
      return;
    }
    getShipmentsBySeason(selectedSeasonId).then(setShipments).catch(() => setShipments([]));
  }, [selectedSeasonId]);

  useEffect(() => {
    if (!selectedSeasonId) {
      setTraderCategoryOrder(new Map());
      return;
    }
    getTraderCategoriesWithShares(selectedSeasonId)
      .then((categories) => {
        const map = new Map<string, number>();
        for (const category of categories) {
          map.set(category.name, category.orderIndex);
        }
        setTraderCategoryOrder(map);
      })
      .catch(() => setTraderCategoryOrder(new Map()));
  }, [selectedSeasonId]);

  return (
    <section className={workspaceStyles.workspace}>
      <header className={workspaceStyles.header}>
        <p className={workspaceStyles.description}>{description}</p>
      </header>
      <ShipmentsSummaryCards
        lang={lang}
        cards={[
          { key: 'total-shipments', label: labels.summary.totalShipments, value: summaryTotals.totalShipments },
          { key: 'total-boxes', label: labels.summary.totalBoxes, value: summaryTotals.totalBoxes },
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
          { key: 'general', label: labels.summary.generalQuantity, value: summaryTotals.generalQuantity },
          { key: 'private', label: labels.summary.privateSelectionQuantity, value: summaryTotals.privateSelectionQuantity },
          { key: 'customer', label: labels.summary.customerQuantity, value: summaryTotals.customerQuantity },
        ]}
      />
      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items-summary"
        filters={summaryFilters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
        actions={hasData ? (
          <div className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`} aria-label={labels.summaryTableActionsLabel}>
            <button
              type="button"
              className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
              onClick={handlePrint}
              aria-label={labels.summaryPrintAriaLabel}
              title={labels.summaryPrintTitle}
            >
              <FaPrint />
            </button>
            <button
              type="button"
              className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
              onClick={() => { void handleExport(); }}
              aria-label={labels.summaryExportAriaLabel}
              title={labels.summaryExportTitle}
            >
              <FaFileArrowDown />
            </button>
          </div>
        ) : undefined}
      />
      {error ? (
        <p>{error}</p>
      ) : isLoading ? (
        <p>{labels.loading}</p>
      ) : (
        <>
          {shipments.length > 0 && (
            <ShipmentsBoxStatusTable
              lang={lang}
              shipments={shipments}
              title={labels.perShipmentTable.title}
              rowBoxesLabel={labels.perShipmentTable.rowBoxes}
              rowStatusLabel={labels.perShipmentTable.rowStatus}
              shipmentColumnLabel={labels.colShipmentNumber}
              statusLabels={labels.perShipmentTable.statusLabels}
            />
          )}
          <ShipmentsSummaryMatrix
            lang={lang}
            matrix={summaryMatrix}
            labels={labels}
          />
          <div className={styles.breakdownPanel}>
            <button
              type="button"
              className={`${styles.breakdownToggle}${isBreakdownOpen ? ` ${styles.breakdownToggleOpen}` : ''}`}
              onClick={() => setIsBreakdownOpen((o) => !o)}
            >
              {isBreakdownOpen ? labels.summaryMatrix.hideBreakdown : labels.summaryMatrix.showBreakdown}
              <span className={`${styles.breakdownArrow}${isBreakdownOpen ? ` ${styles.breakdownArrowOpen}` : ''}`}>▼</span>
            </button>
            {isBreakdownOpen && (
              <div className={styles.breakdownContent}>
                <h3 className={styles.categoriesTitle}>{labels.summaryMatrix.categoriesTitle}</h3>
                <div className={styles.categoryTablesStack}>
                  {perShipmentMatrices.map((matrix) => (
                    <ShipmentBreakdownTable
                      key={matrix.shipmentNumber}
                      lang={lang}
                      data={matrix}
                      shipmentLabel={labels.summaryMatrix.shipmentLabel}
                      ownerColumnLabel={labels.summaryMatrix.ownerColumnLabel}
                      privateSelectionLabel={labels.summaryMatrix.privateSelectionLabel}
                      customersLabel={labels.summaryMatrix.customersLabel}
                      totalLabel={labels.summary.total}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
