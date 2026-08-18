import { useCallback, useMemo } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../../components/ui/GlobalScopedFilters';
import type { IsraelClassificationSeasonRecord } from '../../../../../services/israelClassificationsApi';
import type { IsraelSortCategory } from '../../../../../services/israelSortCategoriesApi';
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
import {
  CategoryGradeMatrixTable,
  type MatrixRow,
  type PitamGradeCell,
} from '../../../../harvest/components/shared/CategoryGradeMatrixTable';
import sharedFilterStyles from '../../../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './IsraelHarvestSortingSummarySection.module.css';

function emptyCell(): PitamGradeCell {
  return { withPitam: 0, withoutPitam: 0, mixed: 0 };
}

function normalizePitamKey(value?: string | null): keyof PitamGradeCell {
  const normalized = (value ?? '').replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'WITH_PITAM') return 'withPitam';
  if (normalized === 'WITHOUT_PITAM') return 'withoutPitam';
  return 'mixed';
}

function sortCategoryNames(
  names: string[],
  orderByName: Map<string, number> | null,
): string[] {
  return [...names].sort((a, b) => {
    if (orderByName) {
      const ai = orderByName.get(a);
      const bi = orderByName.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
    }

    return a.localeCompare(b, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function sortGrades(grades: string[], fallback: string): string[] {
  const fixed = [...HARVEST_GRADE_OPTIONS] as string[];
  return [...grades].sort((a, b) => {
    if (a === fallback) return 1;
    if (b === fallback) return -1;
    const ai = fixed.indexOf(a);
    const bi = fixed.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function addToGradeMap(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
  category: string,
  grade: string,
  key: keyof PitamGradeCell,
  qty: number,
) {
  if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
  const gradeMap = catGradeMap.get(category)!;
  if (!gradeMap.has(grade)) gradeMap.set(grade, emptyCell());
  gradeMap.get(grade)![key] += qty;
}

function mergeGroup(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
): Map<string, PitamGradeCell> {
  const merged = new Map<string, PitamGradeCell>();
  for (const gradeMap of catGradeMap.values()) {
    for (const [grade, cell] of gradeMap) {
      if (!merged.has(grade)) merged.set(grade, emptyCell());
      const target = merged.get(grade)!;
      target.withPitam += cell.withPitam;
      target.withoutPitam += cell.withoutPitam;
      target.mixed += cell.mixed;
    }
  }
  return merged;
}

function toCellsRecord(
  gradeMap: Map<string, PitamGradeCell> | undefined,
): Record<string, PitamGradeCell> {
  const record: Record<string, PitamGradeCell> = {};
  if (!gradeMap) return record;
  for (const [grade, cell] of gradeMap) record[grade] = cell;
  return record;
}

type SortingMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

function buildSortingMatrix(
  records: IsraelClassificationSeasonRecord[],
  grandTotalLabel: string,
  gradeFallback: string,
  categoryOrder: Map<string, number> | null,
): SortingMatrix {
  const catGradeMap = new Map<string, Map<string, PitamGradeCell>>();

  for (const record of records) {
    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const key = normalizePitamKey(record.pitamStatus);
    const grade = (record.grade || '').trim() || gradeFallback;
    const catName = record.category?.name?.trim() || gradeFallback;
    addToGradeMap(catGradeMap, catName, grade, key, qty);
  }

  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  const grades = sortGrades([...usedGrades], gradeFallback);

  const sortedCats = sortCategoryNames([...catGradeMap.keys()], categoryOrder);
  const rows: MatrixRow[] = sortedCats.map((cat) => ({
    key: cat,
    label: cat,
    cells: toCellsRecord(catGradeMap.get(cat)),
  }));

  return {
    rows,
    grades,
    grandTotalRow: {
      label: grandTotalLabel,
      cells: toCellsRecord(mergeGroup(catGradeMap)),
    },
  };
}

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

  const matrix = useMemo(
    () =>
      buildSortingMatrix(
        rows,
        labels.grandTotalLabel,
        labels.breakdown.grade,
        categoryOrder,
      ),
    [rows, labels.grandTotalLabel, labels.breakdown.grade, categoryOrder],
  );

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
          hasData ? (
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

      {hasData ? (
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
            />
          </section>

          <GradeGroupSplitCards
            title={labels.gradeGroups.title}
            splits={gradeGroupSplits}
            groupColumnLabel={labels.gradeGroups.groupColumn}
            percentColumnLabel={labels.gradeGroups.percentColumn}
            locale={locale}
          />
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
