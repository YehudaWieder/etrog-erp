import { useCallback, useMemo } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../components/ui/GlobalScopedFilters';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestI18n } from '../../i18n';
import { HARVEST_GRADE_OPTIONS } from '../../utils/harvestPage.utils';
import {
  buildCategoryGradeGroupSplits,
  buildCategoryGradeTotals,
  buildGradeGroupsByCategory,
} from '../../utils/gradeGroupBreakdown.util';
import {
  printHarvestSortingSummary,
  exportHarvestSortingSummaryToExcel,
} from '../../services/harvestSortingSummaryExport.service';
import { GradeGroupSplitCards } from '../shared/GradeGroupSplitCards';
import {
  CategoryGradeMatrixTable,
  type MatrixRow,
  type PitamGradeCell,
} from '../shared/CategoryGradeMatrixTable';
import sharedFilterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './HarvestSortingSummarySection.module.css';

function emptyCell(): PitamGradeCell {
  return { withPitam: 0, withoutPitam: 0, mixed: 0 };
}

function normalizePitamKey(value?: string | null): keyof PitamGradeCell {
  const normalized = (value ?? '').replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'WITH_PITAM') return 'withPitam';
  if (normalized === 'WITHOUT_PITAM') return 'withoutPitam';
  return 'mixed';
}

function resolveGrade(
  record: ClassificationListRecord,
  fallback: string,
): string {
  return (
    (record.grade || record.customerCategory?.grade || '').trim() || fallback
  );
}

function sortCategoryNames(
  names: string[],
  orderByName: Map<string, number> | null,
  lastLabel?: string,
): string[] {
  return [...names].sort((a, b) => {
    if (lastLabel !== undefined) {
      if (a === lastLabel) return 1;
      if (b === lastLabel) return -1;
    }

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

function buildGroupMatrix(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
  gradeFallback: string,
  grandTotalLabel: string,
  orderByName: Map<string, number> | null,
  noCategoryLabel?: string,
): SortingMatrix {
  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  const grades = sortGrades([...usedGrades], gradeFallback);

  const sortedCats = sortCategoryNames(
    [...catGradeMap.keys()],
    orderByName,
    noCategoryLabel,
  );
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

function buildSortingMatrices(
  records: ClassificationListRecord[],
  generalLabel: string,
  privateSortingLabel: string,
  customersLabel: string,
  gradeFallback: string,
  noCategoryLabel: string,
  traderCategoryOrder: Map<string, number> | null,
): {
  general: SortingMatrix;
  privateSorting: SortingMatrix;
  customers: SortingMatrix;
} {
  const generalCatGrades = new Map<string, Map<string, PitamGradeCell>>();
  const privateCatGrade = new Map<string, Map<string, PitamGradeCell>>();
  const customerCatGrade = new Map<string, Map<string, PitamGradeCell>>();

  for (const record of records) {
    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const key = normalizePitamKey(record.pitamStatus);
    const grade = resolveGrade(record, gradeFallback);

    if (record.assignmentType === 'GENERAL') {
      const catName = record.traderCategory?.name?.trim() || '—';
      addToGradeMap(generalCatGrades, catName, grade, key, qty);
    } else if (record.assignmentType === 'TRADER') {
      const catName = record.traderCategory?.name?.trim() || noCategoryLabel;
      addToGradeMap(privateCatGrade, catName, grade, key, qty);
    } else if (record.assignmentType === 'CUSTOMER') {
      const catName = record.customerCategory?.name?.trim() || noCategoryLabel;
      addToGradeMap(customerCatGrade, catName, grade, key, qty);
    }
  }

  const general = buildGroupMatrix(
    generalCatGrades,
    gradeFallback,
    generalLabel,
    traderCategoryOrder,
  );
  const privateSorting = buildGroupMatrix(
    privateCatGrade,
    gradeFallback,
    privateSortingLabel,
    traderCategoryOrder,
    noCategoryLabel,
  );
  const customers = buildGroupMatrix(
    customerCatGrade,
    gradeFallback,
    customersLabel,
    null,
    noCategoryLabel,
  );

  return { general, privateSorting, customers };
}

type HarvestSortingSummarySectionProps = {
  lang: 'he' | 'en';
  labels: HarvestI18n['sortingSummary'];
  filters: GlobalScopedFilterConfig[];
  rows: ClassificationListRecord[];
  isLoading: boolean;
  loadError: string;
  seasonLabel?: string | null;
  traderCategories?: TraderCategoryWithShares[];
};

export function HarvestSortingSummarySection({
  lang,
  labels,
  filters,
  rows,
  isLoading,
  loadError,
  seasonLabel = null,
  traderCategories = [],
}: HarvestSortingSummarySectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  const gradeGroupsByCategory = useMemo(
    () => buildGradeGroupsByCategory(traderCategories),
    [traderCategories],
  );

  const { general, privateSorting, customers } = useMemo(
    () =>
      buildSortingMatrices(
        rows,
        labels.rows.general,
        labels.rows.privateSorting,
        labels.rows.customers,
        labels.breakdown.grade,
        labels.breakdown.noCategory,
        traderCategoryOrder,
      ),
    [
      rows,
      labels.rows.general,
      labels.rows.privateSorting,
      labels.rows.customers,
      labels.breakdown.grade,
      labels.breakdown.noCategory,
      traderCategoryOrder,
    ],
  );

  const hasData =
    general.rows.length > 0 ||
    privateSorting.rows.length > 0 ||
    customers.rows.length > 0;

  const gradeGroupSplits = useMemo(() => {
    const categoryGradeTotals = buildCategoryGradeTotals(
      rows,
      labels.breakdown.grade,
    );
    return buildCategoryGradeGroupSplits(
      categoryGradeTotals,
      gradeGroupsByCategory,
      traderCategoryOrder,
      labels.gradeGroups.ungrouped,
    );
  }, [
    rows,
    labels.breakdown.grade,
    labels.gradeGroups.ungrouped,
    gradeGroupsByCategory,
    traderCategoryOrder,
  ]);

  const exportMatrices = useMemo(
    () => [
      { title: labels.rows.general, ...general },
      { title: labels.rows.privateSorting, ...privateSorting },
      { title: labels.rows.customers, ...customers },
    ],
    [
      labels.rows.general,
      labels.rows.privateSorting,
      labels.rows.customers,
      general,
      privateSorting,
      customers,
    ],
  );

  const handlePrint = useCallback(() => {
    printHarvestSortingSummary({
      lang,
      labels,
      matrices: exportMatrices,
      gradeGroupSplits,
      seasonLabel,
    });
  }, [lang, labels, exportMatrices, gradeGroupSplits, seasonLabel]);

  const handleExport = useCallback(async () => {
    try {
      await exportHarvestSortingSummaryToExcel({
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
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
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
          {(
            [
              [general, labels.rows.general],
              [privateSorting, labels.rows.privateSorting],
              [customers, labels.rows.customers],
            ] as const
          ).map(([matrix, title]) =>
            matrix.rows.length > 0 ? (
              <section key={title} className={styles.matrixSection}>
                <h3 className={styles.matrixTitle}>{title}</h3>
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
            ) : null,
          )}

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
