import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildShipmentItemsSummaryTotals } from '../services/shipmentsSummary.service';
import { buildGroupMatrix } from '../services/shipmentItemsDetailedMatrix.service';
import { CategoryGradeMatrixTable } from '../../harvest/components/shared/CategoryGradeMatrixTable';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import { useTraderShipmentItemsFilters } from '../hooks/useTraderShipmentItemsFilters';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './styles/ShipmentItemsSummary.module.css';

type TraderShipmentItemsSummarySectionProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  description: string;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function TraderShipmentItemsSummarySection({
  lang,
  labels,
  description,
  refreshKey,
  onSeasonInfoChange,
}: TraderShipmentItemsSummarySectionProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedTraderId,
    selectedStockSource,
    selectedStockStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useTraderShipmentItemsFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const { rows: traderRows, isLoading, error } = useShipmentItemsTable(
    labels,
    selectedSeasonId,
    'all',
    selectedShipmentNumber,
    'type:TRADER',
    refreshKey,
  );

  const [traderCategoryOrder, setTraderCategoryOrder] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!selectedSeasonId) {
      setTraderCategoryOrder(new Map());
      return;
    }

    getTraderCategoriesWithShares(selectedSeasonId)
      .then((categories) => {
        const map = new Map<string, number>();
        for (const category of categories) map.set(category.name, category.orderIndex);
        setTraderCategoryOrder(map);
      })
      .catch(() => setTraderCategoryOrder(new Map()));
  }, [selectedSeasonId]);

  const filteredRows = useMemo(
    () =>
      traderRows
        .filter((row) => selectedTraderId === 'all' || row.traderId === selectedTraderId)
        .filter((row) => {
          if (selectedStockSource === 'all') return true;
          return selectedStockSource === 'PRIVATE_SELECTION' ? row.isPrivateSelection : !row.isPrivateSelection;
        })
        .filter((row) => selectedStockStatus === 'all' || row.shipmentStatus === selectedStockStatus),
    [traderRows, selectedTraderId, selectedStockSource, selectedStockStatus],
  );

  const summaryTotals = useMemo(() => buildShipmentItemsSummaryTotals(filteredRows), [filteredRows]);

  const matrix = useMemo(
    () => buildGroupMatrix(filteredRows, labels.noGrade, labels.summary.total, traderCategoryOrder),
    [filteredRows, labels.noGrade, labels.summary.total, traderCategoryOrder],
  );

  const columnLabels = useMemo(
    () => ({
      withPitam: labels.pitamStatusLabels.WITH_PITAM,
      withoutPitam: labels.pitamStatusLabels.WITHOUT_PITAM,
      mixed: labels.pitamStatusLabels.MIXED,
    }),
    [labels],
  );

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
        ]}
      />
      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items-summary-traders"
        filters={filters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
      />
      {error ? (
        <p>{error}</p>
      ) : isLoading ? (
        <p>{labels.loading}</p>
      ) : (
        <CategoryGradeMatrixTable
          lang={lang}
          rows={matrix.rows}
          grades={matrix.grades}
          grandTotalRow={matrix.grandTotalRow}
          categoryColumnLabel={labels.colCategory}
          totalColumnLabel={labels.summary.total}
          emptyLabel={labels.empty}
          columnLabels={columnLabels}
        />
      )}
    </section>
  );
}
