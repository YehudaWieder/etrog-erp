import { useMemo, type RefObject } from 'react';
import { FaLemon, FaListCheck, FaPrint, FaScaleBalanced } from 'react-icons/fa6';
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
import type { IsraelHarvestRecord } from '../../../../../services/israel/israelHarvestsApi';
import type { IsraelClassificationRecord } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import { HarvestDetailsTriggerButton } from '../../../../harvest/components/shared/HarvestDetailsTriggerButton';
import { HarvestPrintExportActions } from '../../../../harvest/components/shared/HarvestPrintExportActions';
import { HarvestStatCardGrid } from '../../../../harvest/components/shared/HarvestStatCard';
import { GradeGroupSplitCards } from '../../../../harvest/components/shared/GradeGroupSplitCards';
import {
  buildCategoryGradeGroupSplits,
  buildGradeGroupsByCategory,
} from '../../../../harvest/utils/gradeGroupBreakdown.util';
import { formatHarvestGregorianDate } from '../../../../harvest/services/harvestDisplayFormatters.service';
import type { IsraelHarvestI18n } from '../../i18n';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../../../../harvest/components/styles/HarvestPanels.module.css';
import sheetStyles from '../../../../harvest/components/styles/HarvestDetailsSheet.module.css';
import interactiveStyles from '../../../../harvest/components/styles/HarvestInteractive.module.css';

function pitamStatusLabel(
  status: IsraelClassificationRecord['pitamStatus'] | undefined,
  labels: IsraelHarvestI18n['harvestForm']['pitamOptions'],
): string {
  if (status === 'WITH_PITAM') return labels.withPitam;
  if (status === 'WITHOUT_PITAM') return labels.withoutPitam;
  return labels.mixed;
}

type IsraelHarvestDailyDetailsSectionProps = {
  lang: 'he' | 'en';
  t: IsraelHarvestI18n;
  filters: GlobalScopedFilterConfig[];
  isLoading: boolean;
  loadError: string;
  rows: IsraelHarvestRecord[];
  onFiltersChange: (values: Record<string, string>) => void;
  onPrint: () => void;
  onExport: () => void;
  numberFormatter: Intl.NumberFormat;
  sortedQuantityByHarvestId: Map<number, number>;
  sortCategories: IsraelSortCategory[];
  selectedRow: IsraelHarvestRecord | null;
  onSelectRow: (row: IsraelHarvestRecord | null) => void;
  isDetailsPanelOpen: boolean;
  onOpenDetails: (row: IsraelHarvestRecord) => void;
  onCloseDetailsPanel: () => void;
  relatedSortings: IsraelClassificationRecord[];
  isRelatedSortingsLoading: boolean;
  relatedSortingsLoadError: string;
  onPrintDetails: () => void;
  detailsPrintRef?: RefObject<HTMLDivElement>;
};

export function IsraelHarvestDailyDetailsSection({
  lang,
  t,
  filters,
  isLoading,
  loadError,
  rows,
  onFiltersChange,
  onPrint,
  onExport,
  numberFormatter,
  sortedQuantityByHarvestId,
  sortCategories,
  selectedRow,
  onSelectRow,
  isDetailsPanelOpen,
  onOpenDetails,
  onCloseDetailsPanel,
  relatedSortings,
  isRelatedSortingsLoading,
  relatedSortingsLoadError,
  onPrintDetails,
  detailsPrintRef,
}: IsraelHarvestDailyDetailsSectionProps): JSX.Element {
  const dailyT = t.dailyDetails;
  const hasRows = rows.length > 0;

  const categoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of sortCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [sortCategories]);

  const gradeGroupsByCategory = useMemo(
    () => buildGradeGroupsByCategory(sortCategories),
    [sortCategories],
  );

  const gradeGroupSplits = useMemo(() => {
    const categoryGradeTotals = new Map<string, Map<string, number>>();
    for (const record of relatedSortings) {
      const qty = record.quantity || 0;
      if (qty <= 0) continue;
      const catName = record.category?.name?.trim();
      if (!catName) continue;
      const grade = (record.grade || '').trim() || t.sortingDailyDetails.detailsPanel.breakdown.grade;
      if (!categoryGradeTotals.has(catName)) {
        categoryGradeTotals.set(catName, new Map());
      }
      const gradeMap = categoryGradeTotals.get(catName)!;
      gradeMap.set(grade, (gradeMap.get(grade) ?? 0) + qty);
    }

    return buildCategoryGradeGroupSplits(
      categoryGradeTotals,
      gradeGroupsByCategory,
      categoryOrder,
      dailyT.detailsPanel.gradeGroups.ungrouped,
    );
  }, [
    relatedSortings,
    gradeGroupsByCategory,
    categoryOrder,
    t.sortingDailyDetails.detailsPanel.breakdown.grade,
    dailyT.detailsPanel.gradeGroups.ungrouped,
  ]);

  const summaryTotals = useMemo(() => {
    const totalQuantity = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const totalRecordCount = rows.length;
    return {
      totalQuantity,
      totalRecordCount,
      avgQuantityPerHarvest: totalRecordCount > 0 ? totalQuantity / totalRecordCount : 0,
    };
  }, [rows]);

  const columns = useMemo<GlobalDataTableColumn<IsraelHarvestRecord>[]>(
    () => [
      {
        id: 'details',
        header: dailyT.detailsColumnHeader,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={dailyT.detailsPanel.openDetailsAriaLabel}
            onClick={() => onOpenDetails(row)}
          />
        ),
      },
      {
        id: 'fieldName',
        header: dailyT.columns.fieldName,
        sortKey: 'fieldName',
        sortAccessor: (row) => row.field?.name ?? '',
        render: (row) => row.field?.name ?? '',
      },
      {
        id: 'dateGregorian',
        header: dailyT.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortAccessor: (row) => row.dateGregorian,
        defaultSortDirection: 'desc',
        render: (row) => formatHarvestGregorianDate(row.dateGregorian, lang),
      },
      {
        id: 'dateHebrew',
        header: dailyT.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortAccessor: (row) => row.dateHebrew,
        render: (row) => row.dateHebrew,
      },
      {
        id: 'quantity',
        header: dailyT.columns.quantity,
        sortKey: 'quantity',
        sortAccessor: (row) => row.quantity,
        render: (row) => numberFormatter.format(row.quantity),
      },
      {
        id: 'totalSorted',
        header: dailyT.columns.totalSorted,
        sortKey: 'totalSorted',
        sortAccessor: (row) => sortedQuantityByHarvestId.get(row.id) ?? 0,
        render: (row) => {
          const totalSorted = sortedQuantityByHarvestId.get(row.id) ?? 0;
          const isPartial = totalSorted < row.quantity;
          return (
            <span
              className={`${interactiveStyles.classifiedTotal}${isPartial ? ` ${interactiveStyles.classifiedTotalPartial}` : ''}`}
            >
              {numberFormatter.format(totalSorted)}
            </span>
          );
        },
      },
      {
        id: 'updatedBy',
        header: dailyT.columns.updatedBy,
        sortKey: 'updatedBy',
        sortAccessor: (row) => row.updatedBy?.name ?? '',
        render: (row) => row.updatedBy?.name ?? '',
      },
      {
        id: 'notes',
        header: dailyT.columns.notes,
        render: (row) => row.notes || '',
      },
    ],
    [dailyT.columns, dailyT.detailsColumnHeader, dailyT.detailsPanel.openDetailsAriaLabel, lang, numberFormatter, onOpenDetails, sortedQuantityByHarvestId],
  );

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{dailyT.description}</p>
        </div>
      </header>

      <HarvestStatCardGrid
        items={[
          {
            key: 'totalQuantity',
            label: dailyT.summary.totalQuantity,
            value: numberFormatter.format(summaryTotals.totalQuantity),
            icon: <FaLemon aria-hidden="true" />,
          },
          {
            key: 'totalRecordCount',
            label: dailyT.summary.totalRecordCount,
            value: numberFormatter.format(summaryTotals.totalRecordCount),
            icon: <FaListCheck aria-hidden="true" />,
          },
          {
            key: 'avgQuantityPerHarvest',
            label: dailyT.summary.avgQuantityPerHarvest,
            value: numberFormatter.format(Math.round(summaryTotals.avgQuantityPerHarvest)),
            icon: <FaScaleBalanced aria-hidden="true" />,
          },
        ]}
      />

      <GlobalScopedFilters
        scope="israel-harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasRows ? (
            <HarvestPrintExportActions
              lang={lang}
              tableActionsLabel={dailyT.tableActionsLabel}
              onPrint={onPrint}
              onExport={onExport}
              printAriaLabel={dailyT.printAriaLabel}
              printTitle={dailyT.printTitle}
              exportAriaLabel={dailyT.exportAriaLabel}
              exportTitle={dailyT.exportTitle}
            />
          ) : undefined
        }
      />

      {loadError ? <p className="seasons-manager__error">{loadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isLoading ? <p className="seasons-manager__state">{dailyT.loading}</p> : null}

        {!isLoading ? (
          <>
            <GlobalDataTable
              columns={columns}
              rows={rows}
              getRowKey={(row) => row.id}
              emptyLabel={dailyT.empty}
              defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
              selectedRowKey={selectedRow?.id ?? null}
              onRowClick={(row) =>
                onSelectRow(selectedRow?.id === row.id ? null : row)
              }
            />

            {hasRows ? (
              <GlobalLeftDetailsPanel
                isOpen={isDetailsPanelOpen}
                title={dailyT.detailsPanel.title}
                closeLabel={dailyT.detailsPanel.closeLabel}
                onClose={onCloseDetailsPanel}
                headerActions={
                  <button
                    type="button"
                    className="global-left-details-panel__print"
                    onClick={onPrintDetails}
                  >
                    <FaPrint aria-hidden="true" />
                    <span>{dailyT.detailsPanel.printLabel}</span>
                  </button>
                }
              >
                {selectedRow ? (
                  <div ref={detailsPrintRef}>
                    <div className={sheetStyles.sheetCard}>
                      <div className={sheetStyles.sheetHead}>
                        <p>{formatHarvestGregorianDate(selectedRow.dateGregorian, lang)}</p>
                        <p>{selectedRow.dateHebrew}</p>
                        <p>
                          <strong>{dailyT.detailsPanel.fields.field}:</strong> {selectedRow.field?.name ?? ''}
                        </p>
                        <p>
                          <strong>{dailyT.detailsPanel.fields.quantity}:</strong> {numberFormatter.format(selectedRow.quantity)}
                        </p>
                        <p>
                          <strong>{dailyT.detailsPanel.fields.updatedBy}:</strong> {selectedRow.updatedBy?.name ?? ''}
                        </p>
                      </div>

                      {selectedRow.notes ? (
                        <p className={sheetStyles.sheetNote}>
                          <strong>{dailyT.detailsPanel.fields.notes}:</strong> {selectedRow.notes}
                        </p>
                      ) : null}
                    </div>

                    <GradeGroupSplitCards
                      title={dailyT.detailsPanel.gradeGroups.title}
                      splits={gradeGroupSplits}
                      groupColumnLabel={dailyT.detailsPanel.gradeGroups.groupColumn}
                      percentColumnLabel={dailyT.detailsPanel.gradeGroups.percentColumn}
                      locale={lang === 'he' ? 'he-IL' : 'en-US'}
                      compact
                    />

                    <div className={sheetStyles.relatedSortingsCard}>
                      <h4 className={sheetStyles.relatedSortingsTitle}>
                        {dailyT.detailsPanel.relatedSortingsTitle}
                      </h4>

                      {isRelatedSortingsLoading ? (
                        <p className={sheetStyles.relatedSortingsState}>
                          {dailyT.detailsPanel.relatedSortingsLoading}
                        </p>
                      ) : relatedSortingsLoadError ? (
                        <p
                          className={`${sheetStyles.relatedSortingsState} ${sheetStyles.relatedSortingsStateError}`}
                        >
                          {dailyT.detailsPanel.relatedSortingsLoadError}
                        </p>
                      ) : relatedSortings.length === 0 ? (
                        <p className={sheetStyles.relatedSortingsState}>
                          {dailyT.detailsPanel.relatedSortingsEmpty}
                        </p>
                      ) : (
                        <div className={sheetStyles.relatedSortingsTableWrap}>
                          <table className={sheetStyles.relatedSortingsTable}>
                            <thead>
                              <tr>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.fieldCategory}</th>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.category}</th>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.grade}</th>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.pitamStatus}</th>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.quantity}</th>
                                <th>{dailyT.detailsPanel.relatedSortingsColumns.notes}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {relatedSortings.map((sorting) => (
                                <tr key={sorting.id}>
                                  <td>{sorting.fieldCategory?.name ?? ''}</td>
                                  <td>{sorting.category?.name ?? ''}</td>
                                  <td>{sorting.grade}</td>
                                  <td>
                                    {pitamStatusLabel(sorting.pitamStatus, t.harvestForm.pitamOptions)}
                                  </td>
                                  <td>{numberFormatter.format(sorting.quantity)}</td>
                                  <td>{sorting.notes || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </GlobalLeftDetailsPanel>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
