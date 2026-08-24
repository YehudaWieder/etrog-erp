import { useCallback, useMemo } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../../components/ui/GlobalScopedFilters';
import type { IsraelClassificationSeasonRecord } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type { IsraelHarvestI18n } from '../../i18n';
import { HARVEST_GRADE_OPTIONS } from '../../../../harvest/utils/harvestPage.utils';
import {
  buildCategoryGradeGroupSplits,
  buildGradeGroupsByCategory,
} from '../../../../harvest/utils/gradeGroupBreakdown.util';
import {
  printIsraelHarvestSortingSummary,
  exportIsraelHarvestSortingSummaryToExcel,
} from '../../services/israelHarvestSortingSummaryExport.service';
import { GradeGroupSplitCards } from '../../../../harvest/components/shared/GradeGroupSplitCards';
import { CategoryGradeMatrixTable } from '../../../../harvest/components/shared/CategoryGradeMatrixTable';
import { buildSortingMatrix } from '../../utils/israelSortingMatrix.util';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './IsraelHarvestSortingSummarySection.module.css';

type IsraelHarvestSortingSummarySectionProps = {
  lang: 'he' | 'en';
  labels: IsraelHarvestI18n['sortingSummary'];
  filters: GlobalScopedFilterConfig[];
  rows: IsraelClassificationSeasonRecord[];
  isLoading: boolean;
  loadError: string;
  seasonLabel?: string | null;
  sortCategories?: IsraelSortCategory[];
  onFiltersChange: (values: Record<string, string>) => void;
};

export function IsraelHarvestSortingSummarySection({
  lang,
  labels,
  filters,
  rows,
  isLoading,
  loadError,
  seasonLabel = null,
  sortCategories = [],
  onFiltersChange,
}: IsraelHarvestSortingSummarySectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

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

  const matrix = useMemo(
    () =>
      buildSortingMatrix(
        rows,
        labels.grandTotalLabel,
        labels.breakdown.grade,
        categoryOrder,
        allCategoryNames,
        HARVEST_GRADE_OPTIONS,
      ),
    [
      rows,
      labels.grandTotalLabel,
      labels.breakdown.grade,
      categoryOrder,
      allCategoryNames,
    ],
  );

  const hasRealData = rows.some((row) => (row.quantity || 0) > 0);
  const hasData = matrix.rows.length > 0;

  const gradeGroupSplits = useMemo(() => {
    const categoryGradeTotals = new Map<string, Map<string, number>>();
    for (const record of rows) {
      const qty = record.quantity || 0;
      if (qty <= 0) continue;
      const catName = record.category?.name?.trim();
      if (!catName) continue;
      const grade = (record.grade || '').trim() || labels.breakdown.grade;
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
      labels.gradeGroups.ungrouped,
    );
  }, [
    rows,
    labels.breakdown.grade,
    labels.gradeGroups.ungrouped,
    gradeGroupsByCategory,
    categoryOrder,
  ]);

  const exportMatrices = useMemo(
    () => [{ title: labels.tableTitle, ...matrix }],
    [labels.tableTitle, matrix],
  );

  const handlePrint = useCallback(() => {
    printIsraelHarvestSortingSummary({
      lang,
      labels,
      matrices: exportMatrices,
      gradeGroupSplits,
      seasonLabel,
    });
  }, [lang, labels, exportMatrices, gradeGroupSplits, seasonLabel]);

  const handleExport = useCallback(async () => {
    try {
      await exportIsraelHarvestSortingSummaryToExcel({
        lang,
        labels,
        matrices: exportMatrices,
        gradeGroupSplits,
        seasonLabel,
      });
    } catch {
      window.alert(labels.exportError);
    }
  }, [lang, labels, exportMatrices, gradeGroupSplits, seasonLabel]);

  return (
    <section className={styles.section}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{labels.description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="israel-harvest-sorting-summary"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasRealData ? (
            <div
              className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`}
              aria-label={labels.actionsLabel}
            >
              <button
                type="button"
                className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
                onClick={handlePrint}
                aria-label={labels.printAriaLabel}
                title={labels.printTitle}
              >
                <FaPrint />
              </button>
              <button
                type="button"
                className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
                onClick={() => {
                  void handleExport();
                }}
                aria-label={labels.exportAriaLabel}
                title={labels.exportTitle}
              >
                <FaFileArrowDown />
              </button>
            </div>
          ) : undefined
        }
      />

      {isLoading && rows.length === 0 ? (
        <div className={styles.loadingText}>{labels.loading}</div>
      ) : null}

      {!isLoading && !hasData && !loadError ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {!isLoading && hasData ? (
        <>
          <section className={styles.matrixSection}>
            <h3 className={styles.matrixTitle}>{labels.tableTitle}</h3>
            <CategoryGradeMatrixTable
              lang={lang}
              rows={matrix.rows}
              grades={matrix.grades}
              grandTotalRow={matrix.grandTotalRow}
              categoryColumnLabel={labels.columns.category}
              totalColumnLabel={labels.columns.total}
              emptyLabel={labels.empty}
              columnLabels={{
                withPitam: labels.columns.withPitam,
                withoutPitam: labels.columns.withoutPitam,
                mixed: labels.columns.mixed,
              }}
              collapseEmptyPitamColumns={false}
            />
          </section>

          {hasRealData ? (
            <GradeGroupSplitCards
              title={labels.gradeGroups.title}
              splits={gradeGroupSplits}
              groupColumnLabel={labels.gradeGroups.groupColumn}
              percentColumnLabel={labels.gradeGroups.percentColumn}
              locale={locale}
            />
          ) : null}
        </>
      ) : null}

      {loadError ? (
        <div className={`${styles.statusBox} ${styles.statusError}`}>
          <div>{loadError}</div>
        </div>
      ) : null}
    </section>
  );
}
