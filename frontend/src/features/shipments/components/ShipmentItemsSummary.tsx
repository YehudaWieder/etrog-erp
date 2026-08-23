import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../components/ui/GlobalDataTable';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { OwnerCategoryMatrixSection } from './OwnerCategoryMatrixSection';
import { useShipmentsSummaryFilters } from '../hooks/useShipmentsSummaryFilters';
import { getShipmentsSummaryBySeason, type ShipmentSummaryRecord } from '../../../services/shipmentsApi';
import type { ShipmentsTableLabels } from '../shipments.types';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './styles/ShipmentItemsSummary.module.css';

type ShipmentItemsSummaryProps = {
  lang: 'he' | 'en';
  labels: ShipmentsTableLabels;
  description: string;
  refreshKey?: number;
  onSeasonInfoChange?: (info: { selectedSeasonId: number | null; activeSeasonId: number | null }) => void;
};

export function ShipmentItemsSummary({ lang, labels, description, refreshKey, onSeasonInfoChange }: ShipmentItemsSummaryProps) {
  const {
    filters,
    activeSeasonId,
    selectedSeasonId,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useShipmentsSummaryFilters(labels);

  useEffect(() => {
    onSeasonInfoChange?.({ selectedSeasonId, activeSeasonId });
  }, [onSeasonInfoChange, selectedSeasonId, activeSeasonId]);

  const [allRows, setAllRows] = useState<ShipmentSummaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedSeasonId) {
      setAllRows([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getShipmentsSummaryBySeason(selectedSeasonId)
      .then((nextRows) => {
        if (!isMounted) return;
        setAllRows(nextRows);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(labels.error);
        setAllRows([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId, labels.error, refreshKey]);

  const rows = allRows;

  const sortedShipmentNumbers = useMemo(
    () => [...rows].map((row) => row.shipmentNumber).sort((a, b) => b - a),
    [rows],
  );

  const summaryTotals = useMemo(
    () =>
      rows.reduce(
        (totals, row) => ({
          totalShipments: totals.totalShipments + 1,
          totalBoxes: totals.totalBoxes + row.totalBoxes,
          totalQuantity: totals.totalQuantity + row.totalQuantity,
          traderQuantity: totals.traderQuantity + row.traderQuantity,
          customerQuantity: totals.customerQuantity + row.customerQuantity,
        }),
        { totalShipments: 0, totalBoxes: 0, totalQuantity: 0, traderQuantity: 0, customerQuantity: 0 },
      ),
    [rows],
  );

  const columns = useMemo<GlobalDataTableColumn<ShipmentSummaryRecord>[]>(
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
        id: 'traderQuantity',
        header: labels.colTraderQuantity,
        headerLabel: labels.colTraderQuantity,
        sortKey: 'traderQuantity',
        sortAccessor: (row) => row.traderQuantity,
        align: 'center',
        render: (row) => row.traderQuantity.toLocaleString(),
      },
      {
        id: 'customerQuantity',
        header: labels.colCustomerQuantity,
        headerLabel: labels.colCustomerQuantity,
        sortKey: 'customerQuantity',
        sortAccessor: (row) => row.customerQuantity,
        align: 'center',
        render: (row) => row.customerQuantity.toLocaleString(),
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
        <p className={workspaceStyles.description}>{description}</p>
      </header>
      <ShipmentsSummaryCards
        lang={lang}
        cards={[
          { key: 'total-shipments', label: labels.summary.totalShipments, value: summaryTotals.totalShipments },
          { key: 'total-boxes', label: labels.summary.totalBoxes, value: summaryTotals.totalBoxes },
          { key: 'total-quantity', label: labels.summary.totalQuantity, value: summaryTotals.totalQuantity },
          { key: 'trader-general', label: labels.colTraderQuantity, value: summaryTotals.traderQuantity },
          { key: 'customer', label: labels.colCustomerQuantity, value: summaryTotals.customerQuantity },
        ]}
      />
      <GlobalScopedFilters
        className={styles.filtersSection}
        scope="shipments-shipment-items-summary"
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
        <GlobalDataTable<ShipmentSummaryRecord>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyLabel={labels.empty}
          defaultSortState={{ key: 'shipmentNumber', direction: 'desc' }}
        />
      )}
      <div className={styles.ownerMatrixSection}>
        <OwnerCategoryMatrixSection
          lang={lang}
          labels={labels}
          selectedSeasonId={selectedSeasonId}
          refreshKey={refreshKey}
        />
      </div>
      {sortedShipmentNumbers.map((shipmentNumber) => (
        <div key={shipmentNumber} className={styles.ownerMatrixSection}>
          <OwnerCategoryMatrixSection
            lang={lang}
            labels={labels}
            selectedSeasonId={selectedSeasonId}
            selectedShipmentNumber={shipmentNumber}
            titleOverride={`${labels.ownerCategoryMatrix.title} — ${labels.colShipmentNumber} ${shipmentNumber}`}
            refreshKey={refreshKey}
          />
        </div>
      ))}
    </section>
  );
}
