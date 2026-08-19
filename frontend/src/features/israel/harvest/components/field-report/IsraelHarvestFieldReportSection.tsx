import { useMemo, type RefObject } from 'react';
import {
  FaLemon,
  FaListCheck,
  FaMapLocationDot,
  FaPrint,
  FaScaleBalanced,
} from 'react-icons/fa6';
import {
  GLOBAL_DATA_TABLE_WIDTHS,
  GlobalDataTable,
  type GlobalDataTableColumn,
} from '../../../../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../../../../components/ui/GlobalLeftDetailsPanel';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../../components/ui/GlobalScopedFilters';
import type { IsraelHarvestRecord } from '../../../../../services/israelHarvestsApi';
import { HarvestDetailsTriggerButton } from '../../../../harvest/components/shared/HarvestDetailsTriggerButton';
import { HarvestPrintExportActions } from '../../../../harvest/components/shared/HarvestPrintExportActions';
import { HarvestStatCardGrid } from '../../../../harvest/components/shared/HarvestStatCard';
import { formatHarvestGregorianDate } from '../../../../harvest/services/harvestDisplayFormatters.service';
import type { IsraelHarvestFieldReportRow } from '../../israelHarvestPage.types';
import type { IsraelHarvestI18n } from '../../i18n';
import { buildIsraelHarvestFieldReportSummaryTotals } from '../../utils/israelHarvestFieldReport.util';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../../../../harvest/components/styles/HarvestPanels.module.css';
import sheetStyles from '../../../../harvest/components/styles/HarvestDetailsSheet.module.css';

type IsraelHarvestFieldReportSectionProps = {
  lang: 'he' | 'en';
  t: IsraelHarvestI18n;
  filters: GlobalScopedFilterConfig[];
  isLoading: boolean;
  loadError: string;
  rows: IsraelHarvestFieldReportRow[];
  onPrint: () => void;
  onExport: () => void;
  onFiltersChange: (values: Record<string, string>) => void;
  numberFormatter: Intl.NumberFormat;
  selectedFieldReportRow: IsraelHarvestFieldReportRow | null;
  onSelectFieldReportRow: (row: IsraelHarvestFieldReportRow | null) => void;
  fieldReportDetailsRows: IsraelHarvestRecord[];
  onPrintFieldReportDetails: () => void;
  detailsPrintRef?: RefObject<HTMLDivElement>;
};

export function IsraelHarvestFieldReportSection({
  lang,
  t,
  filters,
  isLoading,
  loadError,
  rows,
  onPrint,
  onExport,
  onFiltersChange,
  numberFormatter,
  selectedFieldReportRow,
  onSelectFieldReportRow,
  fieldReportDetailsRows,
  onPrintFieldReportDetails,
  detailsPrintRef,
}: IsraelHarvestFieldReportSectionProps): JSX.Element {
  const hasRows = rows.length > 0;
  const summaryTotals = useMemo(
    () => buildIsraelHarvestFieldReportSummaryTotals(rows),
    [rows],
  );

  const columns = useMemo<GlobalDataTableColumn<IsraelHarvestFieldReportRow>[]>(
    () => [
      {
        id: 'details',
        header: t.fieldReport.detailsColumnHeader,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={t.fieldReport.detailsPanel.openDetailsAriaLabel(row.fieldName)}
            onClick={() => onSelectFieldReportRow(row)}
          />
        ),
      },
      {
        id: 'fieldName',
        header: t.fieldReport.columns.fieldName,
        sortKey: 'fieldName',
        sortAccessor: (row) => row.fieldName,
        render: (row) => row.fieldName,
      },
      {
        id: 'recordCount',
        header: t.fieldReport.columns.recordCount,
        sortKey: 'recordCount',
        align: 'end',
        sortAccessor: (row) => row.recordCount,
        render: (row) => numberFormatter.format(row.recordCount),
      },
      {
        id: 'totalQuantity',
        header: t.fieldReport.columns.totalQuantity,
        sortKey: 'totalQuantity',
        align: 'end',
        sortAccessor: (row) => row.totalQuantity,
        render: (row) => numberFormatter.format(row.totalQuantity),
      },
      {
        id: 'avgQuantityPerHarvest',
        header: t.fieldReport.columns.avgQuantityPerHarvest,
        sortKey: 'avgQuantityPerHarvest',
        align: 'end',
        sortAccessor: (row) => row.avgQuantityPerHarvest,
        render: (row) =>
          numberFormatter.format(Math.round(row.avgQuantityPerHarvest)),
      },
    ],
    [
      t.fieldReport.columns,
      t.fieldReport.detailsColumnHeader,
      t.fieldReport.detailsPanel,
      numberFormatter,
      onSelectFieldReportRow,
    ],
  );

  return (
    <section
      className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}
    >
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>
            {t.fieldReport.description}
          </p>
        </div>
      </header>

      <HarvestStatCardGrid
        items={[
          {
            key: 'totalQuantity',
            label: t.fieldReport.summary.totalQuantity,
            value: numberFormatter.format(summaryTotals.totalQuantity),
            icon: <FaLemon aria-hidden="true" />,
          },
          {
            key: 'totalRecordCount',
            label: t.fieldReport.summary.totalRecordCount,
            value: numberFormatter.format(summaryTotals.totalRecordCount),
            icon: <FaListCheck aria-hidden="true" />,
          },
          {
            key: 'totalFields',
            label: t.fieldReport.summary.totalFields,
            value: numberFormatter.format(summaryTotals.totalFields),
            icon: <FaMapLocationDot aria-hidden="true" />,
          },
          {
            key: 'avgQuantityPerHarvest',
            label: t.fieldReport.summary.avgQuantityPerHarvest,
            value: numberFormatter.format(
              Math.round(summaryTotals.avgQuantityPerHarvest),
            ),
            icon: <FaScaleBalanced aria-hidden="true" />,
          },
        ]}
      />

      <GlobalScopedFilters
        scope="israel-harvest-summary"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasRows ? (
            <HarvestPrintExportActions
              lang={lang}
              tableActionsLabel={t.fieldReport.tableActionsLabel}
              onPrint={onPrint}
              onExport={onExport}
              printAriaLabel={t.fieldReport.printAriaLabel}
              printTitle={t.fieldReport.printTitle}
              exportAriaLabel={t.fieldReport.exportAriaLabel}
              exportTitle={t.fieldReport.exportTitle}
            />
          ) : undefined
        }
      />

      {loadError ? <p className="seasons-manager__error">{loadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isLoading ? (
          <p className="seasons-manager__state">{t.fieldReport.loading}</p>
        ) : null}

        {!isLoading ? (
          <>
            <GlobalDataTable
              columns={columns}
              rows={rows}
              getRowKey={(row) => row.id}
              emptyLabel={t.fieldReport.empty}
              defaultSortState={{ key: 'fieldName', direction: 'asc' }}
            />

            <GlobalLeftDetailsPanel
              isOpen={selectedFieldReportRow !== null}
              title={t.fieldReport.detailsPanel.title(
                selectedFieldReportRow?.fieldName,
              )}
              closeLabel={t.fieldReport.detailsPanel.closeLabel}
              onClose={() => onSelectFieldReportRow(null)}
              headerActions={
                <button
                  type="button"
                  className="global-left-details-panel__print"
                  onClick={onPrintFieldReportDetails}
                >
                  <FaPrint aria-hidden="true" />
                  <span>{t.fieldReport.detailsPanel.printLabel}</span>
                </button>
              }
            >
              {selectedFieldReportRow ? (
                <div ref={detailsPrintRef}>
                  {fieldReportDetailsRows.length === 0 ? (
                    <p className={sheetStyles.relatedSortingsState}>
                      {t.fieldReport.detailsPanel.empty}
                    </p>
                  ) : (
                    <div className={sheetStyles.relatedSortingsTableWrap}>
                      <table className={sheetStyles.relatedSortingsTable}>
                        <thead>
                          <tr>
                            <th>{t.fieldReport.detailsPanel.columns.dateGregorian}</th>
                            <th>{t.fieldReport.detailsPanel.columns.dateHebrew}</th>
                            <th>{t.fieldReport.detailsPanel.columns.quantity}</th>
                            <th>{t.fieldReport.detailsPanel.columns.updatedBy}</th>
                            <th>{t.fieldReport.detailsPanel.columns.notes}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldReportDetailsRows.map((row) => (
                            <tr key={row.id}>
                              <td>{formatHarvestGregorianDate(row.dateGregorian, lang)}</td>
                              <td>{row.dateHebrew}</td>
                              <td>{numberFormatter.format(row.quantity)}</td>
                              <td>{row.updatedBy?.name ?? ''}</td>
                              <td>{row.notes || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </GlobalLeftDetailsPanel>
          </>
        ) : null}
      </div>
    </section>
  );
}
