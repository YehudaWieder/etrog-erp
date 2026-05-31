import type { RefObject } from 'react';
import { FaPrint } from 'react-icons/fa6';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { HarvestFieldReportRow, HarvestSelectionSummaryLabels } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { HarvestFieldReportDetailsPanel, type HarvestFieldReportDetailsData, type HarvestFieldReportDetailsPanelLabels } from './HarvestFieldReportDetailsPanel';
import { HarvestPrintExportActions } from '../shared/HarvestPrintExportActions';
import { HarvestSelectionSummary } from '../shared/HarvestSelectionSummary';

type HarvestFieldReportSectionProps = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  description: string;
  filters: GlobalScopedFilterConfig[];
  harvestLoadError: string;
  isHarvestLoading: boolean;
  loadingLabel: string;
  emptyLabel: string;
  fieldReportColumns: GlobalDataTableColumn<HarvestFieldReportRow>[];
  fieldReportRows: HarvestFieldReportRow[];
  onFieldReportSortedRowsChange: (rows: HarvestFieldReportRow[]) => void;
  onPrintFieldReportTable: () => void;
  onExportFieldReportTableToExcel: () => void;
  fieldReportDetailsData: HarvestFieldReportDetailsData | null;
  onCloseFieldReportDetails: () => void;
  onPrintFieldReportDetails: () => void;
  fieldReportDetailsPrintRef: RefObject<HTMLDivElement>;
  fieldReportDetailsLabels: HarvestFieldReportDetailsPanelLabels;
  fieldReportDetailsEmptyLabel: string;
  selectedCellsCount: number;
  formattedSelectedTotal: string;
  selectionLabels: HarvestSelectionSummaryLabels;
  onClearSelectedNumericCells: () => void;
};

export function HarvestFieldReportSection({
  lang,
  t,
  description,
  filters,
  harvestLoadError,
  isHarvestLoading,
  loadingLabel,
  emptyLabel,
  fieldReportColumns,
  fieldReportRows,
  onFieldReportSortedRowsChange,
  onPrintFieldReportTable,
  onExportFieldReportTableToExcel,
  fieldReportDetailsData,
  onCloseFieldReportDetails,
  onPrintFieldReportDetails,
  fieldReportDetailsPrintRef,
  fieldReportDetailsLabels,
  fieldReportDetailsEmptyLabel,
  selectedCellsCount,
  formattedSelectedTotal,
  selectionLabels,
  onClearSelectedNumericCells,
}: HarvestFieldReportSectionProps): JSX.Element {
  return (
    <section className="settings-workspace harvest-daily-workspace">
      <header className="settings-workspace__header">
        <div>
          <p className="settings-workspace__description">{description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        actions={
          <HarvestPrintExportActions
            lang={lang}
            tableActionsLabel={t.tableActionsLabel}
            onPrint={onPrintFieldReportTable}
            onExport={onExportFieldReportTableToExcel}
            printAriaLabel={t.fieldReport.printAriaLabel}
            printTitle={t.fieldReport.printTitle}
            exportAriaLabel={t.fieldReport.exportAriaLabel}
            exportTitle={t.fieldReport.exportTitle}
          />
        }
      />

      {harvestLoadError ? <p className="seasons-manager__error">{harvestLoadError}</p> : null}

      <div className="settings-panel-wide harvest-daily-workspace__panel">
        {isHarvestLoading ? <p className="seasons-manager__state">{loadingLabel}</p> : null}

        {!isHarvestLoading ? (
          <>
            <GlobalDataTable
              columns={fieldReportColumns}
              rows={fieldReportRows}
              getRowKey={(row) => row.id}
              emptyLabel={emptyLabel}
              defaultSortState={{ key: 'fieldName', direction: 'asc' }}
              onSortedRowsChange={onFieldReportSortedRowsChange}
            />

            <GlobalLeftDetailsPanel
              isOpen={fieldReportDetailsData !== null}
              title={
                fieldReportDetailsData
                  ? t.fieldReport.detailsTitle(fieldReportDetailsData.fieldName)
                  : t.fieldReport.detailsTitle()
              }
              closeLabel={t.fieldReport.closeLabel}
              onClose={onCloseFieldReportDetails}
              headerActions={
                <button
                  type="button"
                  className="global-left-details-panel__print"
                  onClick={onPrintFieldReportDetails}
                >
                  <FaPrint aria-hidden="true" />
                  <span>{t.fieldReport.printLabel}</span>
                </button>
              }
            >
              {fieldReportDetailsData ? (
                <div ref={fieldReportDetailsPrintRef} className="harvest-daily-workspace__print-content">
                  <HarvestFieldReportDetailsPanel
                    data={fieldReportDetailsData}
                    locale={lang === 'he' ? 'he-IL' : 'en-GB'}
                    labels={fieldReportDetailsLabels}
                  />
                </div>
              ) : (
                <p className="harvest-daily-workspace__details-empty">{fieldReportDetailsEmptyLabel}</p>
              )}
            </GlobalLeftDetailsPanel>

            <HarvestSelectionSummary
              selectedCellsCount={selectedCellsCount}
              formattedSelectedTotal={formattedSelectedTotal}
              labels={selectionLabels}
              onClear={onClearSelectedNumericCells}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}



