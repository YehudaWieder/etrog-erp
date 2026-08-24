import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import { CategoryGradeMatrixTable } from '../../../../harvest/components/shared/CategoryGradeMatrixTable';
import { useIsraelFieldShipmentItemsFilters } from '../../hooks/useIsraelFieldShipmentItemsFilters';
import { useIsraelFieldShipmentItemsTable } from '../../hooks/useIsraelFieldShipmentItemsTable';
import {
  buildIsraelFieldShipmentItemsMatrix,
  buildIsraelFieldShipmentItemsSummaryTotals,
} from '../../utils/israelFieldShipmentItemsMatrix.util';
import type { IsraelFieldShipmentItemsTableLabels } from '../../israelShipments.types';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from '../../../../shipments/components/styles/ShipmentItemsSummary.module.css';

type IsraelFieldShipmentItemsSummarySectionProps = {
  lang: 'he' | 'en';
  labels: IsraelFieldShipmentItemsTableLabels;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function IsraelFieldShipmentItemsSummarySection({
  lang,
  labels,
  refreshKey,
  onSeasonInfoChange,
}: IsraelFieldShipmentItemsSummarySectionProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedFieldId,
    selectedShipmentStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useIsraelFieldShipmentItemsFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const { rows, isLoading, error } = useIsraelFieldShipmentItemsTable(
    labels,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedShipmentStatus,
    selectedFieldId,
    refreshKey,
  );

  const [categoryOrder] = useState<Map<string, number>>(new Map());

  const summaryTotals = useMemo(() => buildIsraelFieldShipmentItemsSummaryTotals(rows), [rows]);

  const matrix = useMemo(
    () => buildIsraelFieldShipmentItemsMatrix(rows, labels.noGrade, labels.summary.total, categoryOrder),
    [rows, labels.noGrade, labels.summary.total, categoryOrder],
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
        <p className={workspaceStyles.description}>{labels.description}</p>
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
        scope="israel-shipments-field-summary"
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
