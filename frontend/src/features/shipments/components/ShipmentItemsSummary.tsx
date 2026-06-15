import { useEffect, useMemo, useState } from 'react';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import { ShipmentsSummaryCards } from './shared/ShipmentsSummaryCards';
import { buildShipmentItemsSummaryTotals } from '../services/shipmentsSummary.service';
import { buildShipmentItemsCategoryMatrices, buildShipmentItemsOwnershipMatrix } from '../services/shipmentItemsCategoryMatrix.service';
import { buildShipmentItemsSummaryMatrix } from '../services/shipmentItemsSummaryMatrix.service';
import { useShipmentItemsFilters } from '../hooks/useShipmentItemsFilters';
import { useShipmentItemsTable } from '../hooks/useShipmentItemsTable';
import { ShipmentCategoryTable } from './ShipmentCategoryTable';
import { ShipmentsSummaryMatrix } from './ShipmentsSummaryMatrix';
import { ShipmentsBoxStatusTable } from './ShipmentsBoxStatusTable';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { ShipmentItemsTableLabels, ShipmentRecord } from '../shipments.types';
import workspaceStyles from '../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './styles/ShipmentItemsSummary.module.css';

type ShipmentItemsSummaryProps = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  description: string;
};

export function ShipmentItemsSummary({ lang, labels, description }: ShipmentItemsSummaryProps) {
  const {
    filters,
    selectedSeasonId,
    selectedOwnership,
    handleFilterValuesChange,
    handleFiltersApiReady,
  } = useShipmentItemsFilters(labels);

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
  );

  const summaryTotals = useMemo(() => buildShipmentItemsSummaryTotals(rows), [rows]);
  const summaryMatrix = useMemo(() => buildShipmentItemsSummaryMatrix(rows), [rows]);
  const generalRows = useMemo(
    () => rows.filter((r) => r.ownershipType !== 'CUSTOMER' && !r.isPrivateSelection),
    [rows],
  );
  const privateSelectionRows = useMemo(
    () => rows.filter((r) => r.isPrivateSelection),
    [rows],
  );
  const customerRows = useMemo(
    () => rows.filter((r) => r.ownershipType === 'CUSTOMER'),
    [rows],
  );
  const categoryMatrices = useMemo(() => buildShipmentItemsCategoryMatrices(generalRows), [generalRows]);
  const privateSelectionMatrix = useMemo(() => buildShipmentItemsOwnershipMatrix(privateSelectionRows), [privateSelectionRows]);
  const customersMatrix = useMemo(() => buildShipmentItemsOwnershipMatrix(customerRows), [customerRows]);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);

  useEffect(() => {
    if (!selectedSeasonId) {
      setShipments([]);
      return;
    }
    getShipmentsBySeason(selectedSeasonId).then(setShipments).catch(() => setShipments([]));
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
        ]}
      />
      <ShipmentsSummaryCards
        lang={lang}
        cards={[
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
                  {categoryMatrices.map((matrix) => (
                    <ShipmentCategoryTable
                      key={matrix.categoryName}
                      lang={lang}
                      data={matrix}
                      shipmentColumnLabel={labels.colShipmentNumber}
                      totalLabel={labels.summary.total}
                    />
                  ))}
                </div>
                {privateSelectionMatrix.ownerships.length > 0 && (
                  <>
                    <h3 className={styles.categoriesTitle}>{labels.summaryMatrix.privateSelectionTitle}</h3>
                    <ShipmentCategoryTable
                      lang={lang}
                      data={privateSelectionMatrix}
                      shipmentColumnLabel={labels.colShipmentNumber}
                      totalLabel={labels.summary.total}
                    />
                  </>
                )}
                {customersMatrix.ownerships.length > 0 && (
                  <>
                    <h3 className={styles.categoriesTitle}>{labels.summaryMatrix.customersTitle}</h3>
                    <ShipmentCategoryTable
                      lang={lang}
                      data={customersMatrix}
                      shipmentColumnLabel={labels.colShipmentNumber}
                      totalLabel={labels.summary.total}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
