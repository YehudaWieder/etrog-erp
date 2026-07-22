import { useMemo } from 'react';
import type { RefObject } from 'react';
import { FaPrint, FaLeaf, FaBan, FaScaleBalanced, FaPercent, FaListCheck, FaMapLocationDot } from 'react-icons/fa6';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { HarvestFieldReportRow } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { buildHarvestFieldReportSummaryTotals } from '../../services/harvestFieldReportSummary.service';
import { HarvestFieldReportDetailsPanel, type HarvestFieldReportDetailsData, type HarvestFieldReportDetailsPanelLabels } from './HarvestFieldReportDetailsPanel';
import { HarvestPrintExportActions } from '../shared/HarvestPrintExportActions';
import { HarvestStatCardGrid } from '../shared/HarvestStatCard';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../styles/HarvestPanels.module.css';
import sheetStyles from '../styles/HarvestDetailsSheet.module.css';

type HarvestFieldReportSectionProps = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  description: string;
  fieldReportMethod: 'our' | 'franco';
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
  summaryLabels: HarvestI18n['fieldReport']['summary'];
  numberFormatter: Intl.NumberFormat;
  formatRate: (value: number | string) => string;
};

export function HarvestFieldReportSection({
  lang,
  t,
  description,
  fieldReportMethod,
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
  summaryLabels,
  numberFormatter,
  formatRate,
}: HarvestFieldReportSectionProps): JSX.Element {
  const hasRows = fieldReportRows.length > 0;

  const summaryTotals = useMemo(
    () => buildHarvestFieldReportSummaryTotals(fieldReportRows, fieldReportMethod),
    [fieldReportRows, fieldReportMethod],
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
          { key: 'avgRejectionRate', label: summaryLabels.avgRejectionRate, value: formatRate(summaryTotals.avgRejectionRate), icon: <FaPercent aria-hidden="true" /> },
          { key: 'avgRejectionRateExcludingBadPicks', label: summaryLabels.avgRejectionRateExcludingBadPicks, value: formatRate(summaryTotals.avgRejectionRateExcludingBadPicks), icon: <FaPercent aria-hidden="true" /> },
          { key: 'totalRecordCount', label: summaryLabels.totalRecordCount, value: numberFormatter.format(summaryTotals.totalRecordCount), icon: <FaListCheck aria-hidden="true" /> },
          { key: 'totalFields', label: summaryLabels.totalFields, value: numberFormatter.format(summaryTotals.totalFields), icon: <FaMapLocationDot aria-hidden="true" /> },
        ]}
      />

      <GlobalScopedFilters
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        actions={hasRows ? (
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
                    <p className={sheetStyles.detailsEmpty}>{fieldReportDetailsEmptyLabel}</p>
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



