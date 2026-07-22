import { useMemo } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { FaPrint, FaLeaf, FaBan, FaScaleBalanced } from 'react-icons/fa6';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import { HarvestDailyDetailsContent, type DetailsSheetData, type RelatedSortingsLabels } from './HarvestDailyDetailsContent';
import { HarvestPrintExportActions } from '../shared/HarvestPrintExportActions';
import { HarvestStatCardGrid } from '../shared/HarvestStatCard';
import { buildHarvestDailySummaryTotals } from '../../services/harvestDailySummary.service';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../styles/HarvestPanels.module.css';
import sheetStyles from '../styles/HarvestDetailsSheet.module.css';

type HarvestDailyDetailsSectionProps = {
  lang: 'he' | 'en';
  tableActionsLabel: string;
  printAriaLabel: string;
  printTitle: string;
  exportAriaLabel: string;
  exportTitle: string;
  description: string;
  filters: GlobalScopedFilterConfig[];
  harvestLoadError: string;
  isHarvestLoading: boolean;
  loadingLabel: string;
  emptyLabel: string;
  columns: GlobalDataTableColumn<HarvestRecord>[];
  filteredHarvestRows: HarvestRecord[];
  onHarvestSortedRowsChange: (rows: HarvestRecord[]) => void;
  selectedHarvestRowId: number | null;
  onSelectHarvestRow: Dispatch<SetStateAction<HarvestRecord | null>>;
  isSelectionDisabled?: boolean;
  onPrintHarvestTable: () => void;
  onExportHarvestTableToExcel: () => void;
  detailsRecordOpen: boolean;
  detailsPanelTitle: string;
  detailsPanelCloseLabel: string;
  detailsPanelPrintLabel: string;
  onCloseDetailsPanel: () => void;
  onPrintDetails: () => void;
  detailsSheetData: DetailsSheetData | null;
  detailsPrintRef: RefObject<HTMLDivElement>;
  detailsEmptyLabel: string;
  relatedSortingsLabels: RelatedSortingsLabels;
  isRelatedSortingsLoading: boolean;
  relatedSortingsLoadError: string;
  relatedSortings: import('../../../../services/classificationsApi').ClassificationRecord[];
  sortedRelatedSortings: import('../../../../services/classificationsApi').ClassificationRecord[];
  numberFormatter: Intl.NumberFormat;
  formatRelatedSortingText: (value?: string | null) => string;
  getRelatedSortingAssignmentLabel: (assignmentType: string) => string;
  getRelatedSortingTarget: (row: import('../../../../services/classificationsApi').ClassificationRecord) => string;
  getRelatedSortingCategory: (row: import('../../../../services/classificationsApi').ClassificationRecord) => string;
  getRelatedSortingGrade: (row: import('../../../../services/classificationsApi').ClassificationRecord) => string;
  getRelatedSortingNote: (row: import('../../../../services/classificationsApi').ClassificationRecord) => string;
  summaryLabels: {
    totalHarvested: string;
    totalRejected: string;
    totalNet: string;
  };
};

export function HarvestDailyDetailsSection({
  lang,
  tableActionsLabel,
  printAriaLabel,
  printTitle,
  exportAriaLabel,
  exportTitle,
  description,
  filters,
  harvestLoadError,
  isHarvestLoading,
  loadingLabel,
  emptyLabel,
  columns,
  filteredHarvestRows,
  onHarvestSortedRowsChange,
  selectedHarvestRowId,
  onSelectHarvestRow,
  isSelectionDisabled,
  onPrintHarvestTable,
  onExportHarvestTableToExcel,
  detailsRecordOpen,
  detailsPanelTitle,
  detailsPanelCloseLabel,
  detailsPanelPrintLabel,
  onCloseDetailsPanel,
  onPrintDetails,
  detailsSheetData,
  detailsPrintRef,
  detailsEmptyLabel,
  relatedSortingsLabels,
  isRelatedSortingsLoading,
  relatedSortingsLoadError,
  relatedSortings,
  sortedRelatedSortings,
  numberFormatter,
  formatRelatedSortingText,
  getRelatedSortingAssignmentLabel,
  getRelatedSortingTarget,
  getRelatedSortingCategory,
  getRelatedSortingGrade,
  getRelatedSortingNote,
  summaryLabels,
}: HarvestDailyDetailsSectionProps): JSX.Element {
  const hasRows = filteredHarvestRows.length > 0;

  const summaryTotals = useMemo(
    () => buildHarvestDailySummaryTotals(filteredHarvestRows),
    [filteredHarvestRows],
  );

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{description}</p>
        </div>
      </header>

      <HarvestStatCardGrid
        items={[
          { key: 'totalHarvested', label: summaryLabels.totalHarvested, value: numberFormatter.format(summaryTotals.totalHarvested), icon: <FaLeaf aria-hidden="true" /> },
          { key: 'totalRejected', label: summaryLabels.totalRejected, value: numberFormatter.format(summaryTotals.totalRejected), icon: <FaBan aria-hidden="true" /> },
          { key: 'totalNet', label: summaryLabels.totalNet, value: numberFormatter.format(summaryTotals.totalNet), icon: <FaScaleBalanced aria-hidden="true" /> },
        ]}
      />

      <GlobalScopedFilters
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        actions={hasRows ? (
          <HarvestPrintExportActions
            lang={lang}
            tableActionsLabel={tableActionsLabel}
            onPrint={onPrintHarvestTable}
            onExport={onExportHarvestTableToExcel}
            printAriaLabel={printAriaLabel}
            printTitle={printTitle}
            exportAriaLabel={exportAriaLabel}
            exportTitle={exportTitle}
          />
        ) : undefined}
      />

      {harvestLoadError ? <p className="seasons-manager__error">{harvestLoadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isHarvestLoading ? <p className="seasons-manager__state">{loadingLabel}</p> : null}

        {!isHarvestLoading ? (
          <>
            {hasRows ? (
              <>
                <GlobalDataTable
                  columns={columns}
                  rows={filteredHarvestRows}
                  getRowKey={(row) => row.id}
                  emptyLabel={emptyLabel}
                  defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
                  selectedRowKey={selectedHarvestRowId}
                  onRowClick={isSelectionDisabled ? undefined : (row) => {
                    onSelectHarvestRow((previousSelectedRow) => (previousSelectedRow?.id === row.id ? null : row));
                  }}
                  onSortedRowsChange={onHarvestSortedRowsChange}
                />

                <GlobalLeftDetailsPanel
                  isOpen={detailsRecordOpen}
                  title={detailsPanelTitle}
                  closeLabel={detailsPanelCloseLabel}
                  onClose={onCloseDetailsPanel}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={onPrintDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{detailsPanelPrintLabel}</span>
                    </button>
                  }
                >
                  {detailsSheetData ? (
                    <div className="harvest-daily-workspace__print-content" ref={detailsPrintRef}>
                      <HarvestDailyDetailsContent
                        detailsSheetData={detailsSheetData}
                        relatedSortingsLabels={relatedSortingsLabels}
                        isRelatedSortingsLoading={isRelatedSortingsLoading}
                        relatedSortingsLoadError={relatedSortingsLoadError}
                        relatedSortings={relatedSortings}
                        sortedRelatedSortings={sortedRelatedSortings}
                        numberFormatter={numberFormatter}
                        formatRelatedSortingText={formatRelatedSortingText}
                        getRelatedSortingAssignmentLabel={getRelatedSortingAssignmentLabel}
                        getRelatedSortingTarget={getRelatedSortingTarget}
                        getRelatedSortingCategory={getRelatedSortingCategory}
                        getRelatedSortingGrade={getRelatedSortingGrade}
                        getRelatedSortingNote={getRelatedSortingNote}
                      />
                    </div>
                  ) : (
                    <p className={sheetStyles.detailsEmpty}>{detailsEmptyLabel}</p>
                  )}
                </GlobalLeftDetailsPanel>

              </>
            ) : (
              <p className="seasons-manager__state">{emptyLabel}</p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}



