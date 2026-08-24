import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../../components/ui/GlobalDataTable';
import { ShipmentsSummaryCards } from '../../../../shipments/components/shared/ShipmentsSummaryCards';
import { IsraelFieldCategoryMatrixSection } from './IsraelFieldCategoryMatrixSection';
import { useIsraelShipmentsSummaryFilters } from '../../hooks/useIsraelShipmentsSummaryFilters';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { IsraelShipmentItemsSummaryTableLabels } from '../../israelShipments.types';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from '../../../../shipments/components/styles/ShipmentItemsSummary.module.css';

type IsraelShipmentItemsSummarySectionProps = {
  lang: 'he' | 'en';
  labels: IsraelShipmentItemsSummaryTableLabels;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function IsraelShipmentItemsSummarySection({
  lang,
  labels,
  refreshKey,
  onSeasonInfoChange,
}: IsraelShipmentItemsSummarySectionProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useIsraelShipmentsSummaryFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const [rows, setRows] = useState<IsraelShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSeasonId) {
      setRows([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getIsraelShipmentsBySeason(selectedSeasonId)
      .then((nextRows) => {
        if (!isMounted) return;
        setRows(nextRows);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(labels.error);
        setRows([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, labels.error, refreshKey]);

  const sortedShipmentNumbers = useMemo(
    () => [...rows].map((row) => row.shipmentNumber).sort((a, b) => a - b),
    [rows],
  );

  const summaryTotals = useMemo(
    () =>
      rows.reduce(
        (totals, row) => ({
          totalShipments: totals.totalShipments + 1,
          totalBoxes: totals.totalBoxes + row.totalBoxes,
          totalQuantity: totals.totalQuantity + row.totalQuantity,
        }),
        { totalShipments: 0, totalBoxes: 0, totalQuantity: 0 },
      ),
    [rows],
  );

  const columns = useMemo<GlobalDataTableColumn<IsraelShipmentRecord>[]>(
    () => [
      {
        id: 'shipmentNumber',
        header: labels.colShipmentNumber,
        headerLabel: labels.colShipmentNumber,
        sortKey: 'shipmentNumber',
        sortAccessor: (row) => row.shipmentNumber,
        defaultSortDirection: 'desc',
        align: 'center',
        render: (row) => <strong>{row.shipmentNumber}</strong>,
      },
      {
        id: 'field',
        header: labels.colField,
        headerLabel: labels.colField,
        sortKey: 'field',
        sortAccessor: (row) => row.field?.name ?? '',
        align: 'center',
        render: (row) => row.field?.name ?? '',
      },
      {
        id: 'totalBoxes',
        header: labels.colBoxCount,
        headerLabel: labels.colBoxCount,
        sortKey: 'totalBoxes',
        sortAccessor: (row) => row.totalBoxes,
        align: 'center',
        render: (row) => row.totalBoxes.toLocaleString(),
      },
      {
        id: 'totalQuantity',
        header: labels.colQuantity,
        headerLabel: labels.colQuantity,
        sortKey: 'totalQuantity',
        sortAccessor: (row) => row.totalQuantity,
        align: 'center',
        render: (row) => row.totalQuantity.toLocaleString(),
      },
      {
        id: 'status',
        header: labels.colStatus,
        headerLabel: labels.colStatus,
        sortKey: 'status',
        sortAccessor: (row) => labels.statusLabels[row.status],
        align: 'center',
        render: (row) => labels.statusLabels[row.status],
      },
    ],
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
        scope="israel-shipments-shipment-items-summary"
        filters={filters}
        onValuesChange={handleFilterValuesChange}
        onApiReady={handleFiltersApiReady}
      />
      {error ? (
        <p>{error}</p>
      ) : isLoading ? (
        <p>{labels.loading}</p>
      ) : rows.length === 0 ? (
        <p>{labels.empty}</p>
      ) : (
        <GlobalDataTable<IsraelShipmentRecord>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyLabel={labels.empty}
          defaultSortState={{ key: 'shipmentNumber', direction: 'desc' }}
        />
      )}
      <div className={styles.ownerMatrixSection}>
        <IsraelFieldCategoryMatrixSection
          lang={lang}
          labels={labels}
          selectedSeasonId={selectedSeasonId}
          refreshKey={refreshKey}
        />
      </div>
      {sortedShipmentNumbers.map((shipmentNumber) => (
        <div key={shipmentNumber} className={styles.ownerMatrixSection}>
          <IsraelFieldCategoryMatrixSection
            lang={lang}
            labels={labels}
            selectedSeasonId={selectedSeasonId}
            selectedShipmentNumber={shipmentNumber}
            titleOverride={`${labels.fieldCategoryMatrix.title} — ${labels.colShipmentNumber} ${shipmentNumber}`}
            refreshKey={refreshKey}
          />
        </div>
      ))}
    </section>
  );
}
