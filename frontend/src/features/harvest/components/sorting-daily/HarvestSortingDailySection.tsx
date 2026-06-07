import type { Dispatch, RefObject, SetStateAction } from 'react';
import { FaPrint } from 'react-icons/fa6';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { ClassificationDailySummaryRow } from '../../../../services/classificationsApi';
import type { HarvestSelectionSummaryLabels } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { HarvestSelectionSummary } from '../shared/HarvestSelectionSummary';
import {
  HarvestSortingDailyDetailsContent,
  type SortingDailyCategoryBreakdown,
  type SortingDailyDetailsData,
} from './HarvestSortingDailyDetailsContent';
import { HarvestSortingPrintExportActions } from '../shared/HarvestSortingPrintExportActions';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../styles/HarvestPanels.module.css';
import sheetStyles from '../styles/HarvestDetailsSheet.module.css';

type HarvestSortingDailySectionProps = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  description: string;
  filters: GlobalScopedFilterConfig[];
  sortingDailyLoadError: string;
  isSortingDailyLoading: boolean;
  loadingLabel: string;
  emptyLabel: string;
  sortingDailyColumns: GlobalDataTableColumn<ClassificationDailySummaryRow>[];
  filteredSortingDailyRows: ClassificationDailySummaryRow[];
  onSortingDailySortedRowsChange: (rows: ClassificationDailySummaryRow[]) => void;
  selectedSortingDailyRowId: number | null;
  onSelectSortingDailyRow: Dispatch<SetStateAction<number | null>>;
  onPrintSummary: () => void;
  onExportSummary: () => void;
  onExportExpanded: () => void;
  onCloseMenuFromTarget: (target: EventTarget | null) => void;
  onCancelMenuClose: () => void;
  onScheduleMenuClose: (menu: HTMLDetailsElement) => void;
  sortingDailyDetailsData: SortingDailyDetailsData | null;
  onCloseSortingDailyDetails: () => void;
  onPrintSortingDailyDetails: () => void;
  sortingDailyDetailsPrintRef: RefObject<HTMLDivElement>;
  sortingDailyCategoryBreakdown: SortingDailyCategoryBreakdown[];
  isSortingDailyDetailRowsLoading: boolean;
  sortingDailyDetailRowsLoadError: string;
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
  sortingDailyDetailsLabels: {
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
  };
  selectedCellsCount: number;
  formattedSelectedTotal: string;
  selectionLabels: HarvestSelectionSummaryLabels;
  onClearSelectedNumericCells: () => void;
};

export function HarvestSortingDailySection({
  lang,
  t,
  description,
  filters,
  sortingDailyLoadError,
  isSortingDailyLoading,
  loadingLabel,
  emptyLabel,
  sortingDailyColumns,
  filteredSortingDailyRows,
  onSortingDailySortedRowsChange,
  selectedSortingDailyRowId,
  onSelectSortingDailyRow,
  onPrintSummary,
  onExportSummary,
  onExportExpanded,
  onCloseMenuFromTarget,
  onCancelMenuClose,
  onScheduleMenuClose,
  sortingDailyDetailsData,
  onCloseSortingDailyDetails,
  onPrintSortingDailyDetails,
  sortingDailyDetailsPrintRef,
  sortingDailyCategoryBreakdown,
  isSortingDailyDetailRowsLoading,
  sortingDailyDetailRowsLoadError,
  formatGregorianDate,
  numberFormatter,
  sortingDailyDetailsLabels,
  selectedCellsCount,
  formattedSelectedTotal,
  selectionLabels,
  onClearSelectedNumericCells,
}: HarvestSortingDailySectionProps): JSX.Element {
  const hasRows = filteredSortingDailyRows.length > 0;

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        actions={hasRows ? (
          <HarvestSortingPrintExportActions
            lang={lang}
            tableActionsLabel={t.tableActionsLabel}
            t={t.sortingDailyDetails.actions}
            onPrintSummary={onPrintSummary}
            onExportSummary={onExportSummary}
            onExportExpanded={onExportExpanded}
            onCloseMenuFromTarget={onCloseMenuFromTarget}
            onCancelMenuClose={onCancelMenuClose}
            onScheduleMenuClose={onScheduleMenuClose}
          />
        ) : undefined}
      />

      {sortingDailyLoadError ? <p className="seasons-manager__error">{sortingDailyLoadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isSortingDailyLoading ? <p className="seasons-manager__state">{loadingLabel}</p> : null}

        {!isSortingDailyLoading ? (
          <>
            {hasRows ? (
              <>
                <GlobalDataTable
                  columns={sortingDailyColumns}
                  rows={filteredSortingDailyRows}
                  getRowKey={(row) => row.harvestId}
                  emptyLabel={emptyLabel}
                  defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
                  selectedRowKey={selectedSortingDailyRowId}
                  onRowClick={(row) => {
                    onSelectSortingDailyRow((previousSelectedRowId) =>
                      previousSelectedRowId === row.harvestId ? null : row.harvestId,
                    );
                  }}
                  onSortedRowsChange={onSortingDailySortedRowsChange}
                />

                <GlobalLeftDetailsPanel
                  isOpen={sortingDailyDetailsData !== null}
                  title={t.sortingDailyDetails.title}
                  closeLabel={t.sortingDailyDetails.closeLabel}
                  onClose={onCloseSortingDailyDetails}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={onPrintSortingDailyDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{t.sortingDailyDetails.print}</span>
                    </button>
                  }
                >
                  {sortingDailyDetailsData ? (
                    <div className="harvest-daily-workspace__print-content" ref={sortingDailyDetailsPrintRef}>
                      <HarvestSortingDailyDetailsContent
                        lang={lang}
                        t={t}
                        data={sortingDailyDetailsData}
                        categoryBreakdown={sortingDailyCategoryBreakdown}
                        isDetailRowsLoading={isSortingDailyDetailRowsLoading}
                        detailRowsLoadError={sortingDailyDetailRowsLoadError}
                        emptyLabel={emptyLabel}
                        formatGregorianDate={formatGregorianDate}
                        numberFormatter={numberFormatter}
                        labels={sortingDailyDetailsLabels}
                      />
                    </div>
                  ) : (
                    <p className={sheetStyles.detailsEmpty}>{emptyLabel}</p>
                  )}
                </GlobalLeftDetailsPanel>

                <HarvestSelectionSummary
                  selectedCellsCount={selectedCellsCount}
                  formattedSelectedTotal={formattedSelectedTotal}
                  labels={selectionLabels}
                  onClear={onClearSelectedNumericCells}
                />
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
