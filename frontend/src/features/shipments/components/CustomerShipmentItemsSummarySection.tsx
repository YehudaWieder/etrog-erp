import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildShipmentItemsSummaryTotals } from '../services/shipmentsSummary.service';
import { buildGroupMatrix } from '../services/shipmentItemsDetailedMatrix.service';
import { CategoryGradeMatrixTable } from '../../harvest/components/shared/CategoryGradeMatrixTable';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import { useCustomerShipmentItemsFilters } from '../hooks/useCustomerShipmentItemsFilters';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './styles/ShipmentItemsSummary.module.css';

type CustomerShipmentItemsSummarySectionProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  description: string;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function CustomerShipmentItemsSummarySection({
  lang,
  labels,
  description,
  refreshKey,
  onSeasonInfoChange,
}: CustomerShipmentItemsSummarySectionProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedCustomerId,
    selectedStockStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useCustomerShipmentItemsFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const { rows: customerRows, isLoading, error } = useShipmentItemsTable(
    labels,
    selectedSeasonId,
    'all',
    selectedShipmentNumber,
    'type:CUSTOMER',
    refreshKey,
  );

  const filteredRows = useMemo(
    () =>
      customerRows
        .filter((row) => selectedCustomerId === 'all' || row.customerId === selectedCustomerId)
        .filter((row) => selectedStockStatus === 'all' || row.shipmentStatus === selectedStockStatus),
    [customerRows, selectedCustomerId, selectedStockStatus],
  );

  const summaryTotals = useMemo(() => buildShipmentItemsSummaryTotals(filteredRows), [filteredRows]);

  const matrix = useMemo(
    () => buildGroupMatrix(filteredRows, labels.noGrade, labels.summary.total, null),
    [filteredRows, labels.noGrade, labels.summary.total],
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
        ]}
      />
      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items-summary-customers"
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
