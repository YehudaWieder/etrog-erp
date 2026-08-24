import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { FaBoxesStacked, FaListCheck, FaPrint } from 'react-icons/fa6';
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
import type { IsraelClassificationSeasonRecord } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import { HarvestDetailsTriggerButton } from '../../../../harvest/components/shared/HarvestDetailsTriggerButton';
import { HarvestPrintExportActions } from '../../../../harvest/components/shared/HarvestPrintExportActions';
import { HarvestStatCardGrid } from '../../../../harvest/components/shared/HarvestStatCard';
import { GradeGroupSplitCards } from '../../../../harvest/components/shared/GradeGroupSplitCards';
import { CategoryGradeMatrixTable } from '../../../../harvest/components/shared/CategoryGradeMatrixTable';
import { formatHarvestGregorianDate } from '../../../../harvest/services/harvestDisplayFormatters.service';
import { HARVEST_GRADE_OPTIONS } from '../../../../harvest/utils/harvestPage.utils';
import {
  buildCategoryGradeGroupSplits,
  buildGradeGroupsByCategory,
} from '../../../../harvest/utils/gradeGroupBreakdown.util';
import { buildSortingMatrix } from '../../utils/israelSortingMatrix.util';
import {
  buildIsraelSortingDailyRows,
  type IsraelSortingDailyRow,
} from '../../utils/israelHarvestSortingDaily.util';
import type { IsraelHarvestI18n } from '../../i18n';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../../../../harvest/components/styles/HarvestPanels.module.css';
import sheetStyles from '../../../../harvest/components/styles/HarvestDetailsSheet.module.css';
import breakdownStyles from '../../../../harvest/components/sorting-daily/HarvestSortingDailyCategoryBreakdown.module.css';

type IsraelHarvestSortingDailySectionProps = {
  lang: 'he' | 'en';
  t: IsraelHarvestI18n;
  filters: GlobalScopedFilterConfig[];
  rows: IsraelClassificationSeasonRecord[];
  isLoading: boolean;
  loadError: string;
  numberFormatter: Intl.NumberFormat;
  sortCategories?: IsraelSortCategory[];
  onFiltersChange: (values: Record<string, string>) => void;
  onPrint: () => void;
  onExport: () => void;
  selectedHarvestId: number | null;
  onSelectHarvestId: Dispatch<SetStateAction<number | null>>;
  isDetailsPanelOpen: boolean;
  onOpenDetails: (harvestId: number) => void;
  onCloseDetailsPanel: () => void;
  detailsPrintRef?: RefObject<HTMLDivElement>;
  onPrintDetails: () => void;
};

export function IsraelHarvestSortingDailySection({
  lang,
  t,
  filters,
  rows,
  isLoading,
  loadError,
  numberFormatter,
  sortCategories = [],
  onFiltersChange,
  onPrint,
  onExport,
  selectedHarvestId,
  onSelectHarvestId,
  isDetailsPanelOpen,
  onOpenDetails,
  onCloseDetailsPanel,
  detailsPrintRef,
  onPrintDetails,
}: IsraelHarvestSortingDailySectionProps) {
  const sd = t.sortingDailyDetails;
  const dp = sd.detailsPanel;

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

  const allCategoryNames = useMemo(
    () => sortCategories.map((category) => category.name),
    [sortCategories],
  );

  const { rows: dailyRows, categories } = useMemo(
    () => buildIsraelSortingDailyRows(rows, categoryOrder, allCategoryNames),
    [rows, categoryOrder, allCategoryNames],
  );

  const hasRows = dailyRows.length > 0;

  const summaryTotals = useMemo(() => {
    const totalSorted = dailyRows.reduce((sum, row) => sum + row.totalSorted, 0);
    return { totalSorted, totalHarvests: dailyRows.length };
  }, [dailyRows]);

  const columns = useMemo<GlobalDataTableColumn<IsraelSortingDailyRow>[]>(() => {
    const base: GlobalDataTableColumn<IsraelSortingDailyRow>[] = [
      {
        id: 'details',
        header: sd.detailsColumnHeader,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <HarvestDetailsTriggerButton
            ariaLabel={dp.openDetailsAriaLabel}
            onClick={() => onOpenDetails(row.harvestId)}
          />
        ),
      },
      {
        id: 'dateGregorian',
        header: sd.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortAccessor: (row) => row.dateGregorian,
        defaultSortDirection: 'desc',
        render: (row) => formatHarvestGregorianDate(row.dateGregorian, lang),
      },
      {
        id: 'dateHebrew',
        header: sd.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortAccessor: (row) => row.dateHebrew,
        render: (row) => row.dateHebrew || '-',
      },
      {
        id: 'fieldName',
        header: sd.columns.fieldName,
        sortKey: 'fieldName',
        sortAccessor: (row) => row.fieldName,
        render: (row) => row.fieldName,
      },
    ];

    const categoryColumns: GlobalDataTableColumn<IsraelSortingDailyRow>[] =
      categories.map((category) => ({
        id: `category-${category}`,
        header: category,
        sortKey: `category-${category}`,
        sortAccessor: (row) => row.categoryTotals[category] ?? 0,
        render: (row) => numberFormatter.format(row.categoryTotals[category] ?? 0),
      }));

    const totalColumn: GlobalDataTableColumn<IsraelSortingDailyRow> = {
      id: 'total',
      header: sd.columns.total,
      sortKey: 'total',
      sortAccessor: (row) => row.totalSorted,
      render: (row) => numberFormatter.format(row.totalSorted),
    };

    return [...base, ...categoryColumns, totalColumn];
  }, [sd.columns, sd.detailsColumnHeader, dp.openDetailsAriaLabel, categories, lang, numberFormatter, onOpenDetails]);

  const selectedHarvestRow = useMemo(
    () => dailyRows.find((row) => row.harvestId === selectedHarvestId) ?? null,
    [dailyRows, selectedHarvestId],
  );

  const selectedHarvestClassifications = useMemo(
    () =>
      selectedHarvestId === null
        ? []
        : rows.filter((row) => row.harvestId === selectedHarvestId),
    [rows, selectedHarvestId],
  );

  const detailsMatrix = useMemo(() => {
    const matrix = buildSortingMatrix(
      selectedHarvestClassifications,
      dp.grandTotalLabel,
      dp.breakdown.grade,
      categoryOrder,
      [],
      HARVEST_GRADE_OPTIONS,
    );

    const visibilityRows = [...matrix.rows, matrix.grandTotalRow];
    const gradesWithData = matrix.grades.filter((grade) =>
      visibilityRows.some((row) => {
        const cell = row.cells[grade];
        return cell ? cell.withPitam > 0 || cell.withoutPitam > 0 || cell.mixed > 0 : false;
      }),
    );

    return { ...matrix, grades: gradesWithData.length > 0 ? gradesWithData : matrix.grades };
  }, [selectedHarvestClassifications, dp.grandTotalLabel, dp.breakdown.grade, categoryOrder]);

  const gradeGroupSplits = useMemo(() => {
    const categoryGradeTotals = new Map<string, Map<string, number>>();
    for (const record of selectedHarvestClassifications) {
      const qty = record.quantity || 0;
      if (qty <= 0) continue;
      const catName = record.category?.name?.trim();
      if (!catName) continue;
      const grade = (record.grade || '').trim() || dp.breakdown.grade;
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
      dp.gradeGroups.ungrouped,
    );
  }, [selectedHarvestClassifications, dp.breakdown.grade, dp.gradeGroups.ungrouped, gradeGroupsByCategory, categoryOrder]);

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{sd.description}</p>
        </div>
      </header>

      <HarvestStatCardGrid
        items={[
          {
            key: 'totalSorted',
            label: sd.summary.totalSorted,
            value: numberFormatter.format(summaryTotals.totalSorted),
            icon: <FaBoxesStacked aria-hidden="true" />,
          },
          {
            key: 'totalHarvests',
            label: sd.summary.totalHarvests,
            value: numberFormatter.format(summaryTotals.totalHarvests),
            icon: <FaListCheck aria-hidden="true" />,
          },
        ]}
      />

      <GlobalScopedFilters
        scope="israel-harvest-sorting-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasRows ? (
            <HarvestPrintExportActions
              lang={lang}
              tableActionsLabel={sd.tableActionsLabel}
              onPrint={onPrint}
              onExport={onExport}
              printAriaLabel={sd.printAriaLabel}
              printTitle={sd.printTitle}
              exportAriaLabel={sd.exportAriaLabel}
              exportTitle={sd.exportTitle}
            />
          ) : undefined
        }
      />

      {loadError ? <p className="seasons-manager__error">{loadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isLoading ? <p className="seasons-manager__state">{sd.loading}</p> : null}

        {!isLoading ? (
          <>
            <GlobalDataTable
              columns={columns}
              rows={dailyRows}
              getRowKey={(row) => row.harvestId}
              emptyLabel={sd.empty}
              defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
              selectedRowKey={selectedHarvestId}
              onRowClick={(row) =>
                onSelectHarvestId((previous) =>
                  previous === row.harvestId ? null : row.harvestId,
                )
              }
            />

            <GlobalLeftDetailsPanel
              isOpen={isDetailsPanelOpen}
              title={dp.title}
              closeLabel={dp.closeLabel}
              onClose={onCloseDetailsPanel}
              headerActions={
                <button
                  type="button"
                  className="global-left-details-panel__print"
                  onClick={onPrintDetails}
                >
                  <FaPrint aria-hidden="true" />
                  <span>{dp.printLabel}</span>
                </button>
              }
            >
              {selectedHarvestRow ? (
                <div ref={detailsPrintRef} style={{ display: 'grid', gap: 14 }}>
                  <div className={sheetStyles.sheetCard}>
                    <div className={sheetStyles.sheetHead}>
                      <p>{formatHarvestGregorianDate(selectedHarvestRow.dateGregorian, lang)}</p>
                      <p>{selectedHarvestRow.dateHebrew}</p>
                      <p>
                        <strong>{sd.columns.fieldName}:</strong> {selectedHarvestRow.fieldName}
                      </p>
                      <p>
                        <strong>{sd.columns.total}:</strong> {numberFormatter.format(selectedHarvestRow.totalSorted)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`${sheetStyles.sheetCard} ${sheetStyles.sheetCardBorderless} ${sheetStyles.sheetCardCategoryBreakdown} ${breakdownStyles.panelMatrix}`}
                  >
                    <h4 className={sheetStyles.relatedSortingsTitle} style={{ marginTop: 0 }}>
                      {dp.sortingDetailsTitle}
                    </h4>
                    <CategoryGradeMatrixTable
                      lang={lang}
                      rows={detailsMatrix.rows}
                      grades={detailsMatrix.grades}
                      grandTotalRow={detailsMatrix.grandTotalRow}
                      categoryColumnLabel={dp.matrixColumns.category}
                      totalColumnLabel={dp.matrixColumns.total}
                      emptyLabel={sd.empty}
                      columnLabels={{
                        withPitam: dp.matrixColumns.withPitam,
                        withoutPitam: dp.matrixColumns.withoutPitam,
                        mixed: dp.matrixColumns.mixed,
                      }}
                    />
                  </div>

                  <GradeGroupSplitCards
                    title={dp.gradeGroups.title}
                    splits={gradeGroupSplits}
                    groupColumnLabel={dp.gradeGroups.groupColumn}
                    percentColumnLabel={dp.gradeGroups.percentColumn}
                    locale={lang === 'he' ? 'he-IL' : 'en-US'}
                    compact
                  />
                </div>
              ) : null}
            </GlobalLeftDetailsPanel>
          </>
        ) : null}
      </div>
    </section>
  );
}
