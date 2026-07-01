import { useCallback, useMemo, useState } from 'react';
import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestI18n } from '../../i18n';
import { HARVEST_GRADE_OPTIONS } from '../../utils/harvestPage.utils';
import { printHarvestSortingSummary, exportHarvestSortingSummaryToExcel } from '../../services/harvestSortingSummaryExport.service';
import sharedFilterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import styles from './HarvestSortingSummarySection.module.css';

type PitamTotals = {
  WITH_PITAM: number;
  WITHOUT_PITAM: number;
  MIXED: number;
};

type SummaryRow = {
  key: string;
  label: string;
  pitam: PitamTotals;
  total: number;
  isSeparator?: boolean;
};

type BreakdownGradeRow = {
  key: string;
  category?: string;
  grade: string;
  pitam: PitamTotals;
  total: number;
};

type BreakdownEntry = {
  key: string;
  label: string;
  showCategoryColumn: boolean;
  rows: BreakdownGradeRow[];
  grandPitam: PitamTotals;
  grandTotal: number;
};

function normalizePitamStatus(value?: string | null): keyof PitamTotals {
  const normalized = (value ?? '').replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'WITH_PITAM') return 'WITH_PITAM';
  if (normalized === 'WITHOUT_PITAM') return 'WITHOUT_PITAM';
  return 'MIXED';
}

function resolveGrade(record: ClassificationListRecord, fallback: string): string {
  return (record.grade || record.customerCategory?.grade || '').trim() || fallback;
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

    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
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
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  });
}

function buildSortingData(
  records: ClassificationListRecord[],
  privateSortingLabel: string,
  customersLabel: string,
  gradeFallback: string,
  noCategoryLabel: string,
  traderCategoryOrder: Map<string, number> | null,
): { summaryRows: SummaryRow[]; breakdown: BreakdownEntry[] } {
  // GENERAL: keyed by category name only
  const generalCatPitam = new Map<string, PitamTotals>();
  const generalCatGrades = new Map<string, Map<string, PitamTotals>>();

  // TRADER / CUSTOMER: keyed by "category::grade"
  const privatePitam: PitamTotals = { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
  const privateCatGrade = new Map<string, Map<string, PitamTotals>>(); // category → grade → pitam
  const customerPitam: PitamTotals = { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
  const customerCatGrade = new Map<string, Map<string, PitamTotals>>();

  const addToGradeMap = (
    catGradeMap: Map<string, Map<string, PitamTotals>>,
    category: string,
    grade: string,
    pitam: keyof PitamTotals,
    qty: number,
  ) => {
    if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
    const gradeMap = catGradeMap.get(category)!;
    if (!gradeMap.has(grade)) gradeMap.set(grade, { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 });
    gradeMap.get(grade)![pitam] += qty;
  };

  for (const record of records) {
    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const pitam = normalizePitamStatus(record.pitamStatus);
    const grade = resolveGrade(record, gradeFallback);

    if (record.assignmentType === 'GENERAL') {
      const catName = record.traderCategory?.name?.trim() || '—';
      if (!generalCatPitam.has(catName)) {
        generalCatPitam.set(catName, { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 });
        generalCatGrades.set(catName, new Map());
      }
      generalCatPitam.get(catName)![pitam] += qty;
      const gradeMap = generalCatGrades.get(catName)!;
      if (!gradeMap.has(grade)) gradeMap.set(grade, { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 });
      gradeMap.get(grade)![pitam] += qty;
    } else if (record.assignmentType === 'TRADER') {
      privatePitam[pitam] += qty;
      const catName = record.traderCategory?.name?.trim() || noCategoryLabel;
      addToGradeMap(privateCatGrade, catName, grade, pitam, qty);
    } else if (record.assignmentType === 'CUSTOMER') {
      customerPitam[pitam] += qty;
      const catName = record.customerCategory?.name?.trim() || noCategoryLabel;
      addToGradeMap(customerCatGrade, catName, grade, pitam, qty);
    }
  }

  // Build breakdown rows for GENERAL categories (no category column, just grade rows)
  const buildGeneralBreakdown = (
    key: string,
    label: string,
    pitam: PitamTotals,
    gradeMap: Map<string, PitamTotals>,
  ): { summary: SummaryRow; entry: BreakdownEntry } => {
    const total = pitam.WITH_PITAM + pitam.WITHOUT_PITAM + pitam.MIXED;
    const sortedGrades = sortGrades([...gradeMap.keys()], gradeFallback);
    const rows: BreakdownGradeRow[] = sortedGrades.map((g) => {
      const p = gradeMap.get(g)!;
      return { key: g, grade: g, pitam: p, total: p.WITH_PITAM + p.WITHOUT_PITAM + p.MIXED };
    });
    return {
      summary: { key, label, pitam, total },
      entry: { key, label, showCategoryColumn: false, rows, grandPitam: pitam, grandTotal: total },
    };
  };

  // Build breakdown rows for TRADER/CUSTOMER (with category column: category × grade rows)
  const buildCategoryGradeBreakdown = (
    key: string,
    label: string,
    pitam: PitamTotals,
    catGradeMap: Map<string, Map<string, PitamTotals>>,
    orderByName: Map<string, number> | null,
  ): { summary: SummaryRow; entry: BreakdownEntry } => {
    const total = pitam.WITH_PITAM + pitam.WITHOUT_PITAM + pitam.MIXED;
    const sortedCategories = sortCategoryNames([...catGradeMap.keys()], orderByName, noCategoryLabel);
    const rows: BreakdownGradeRow[] = [];
    for (const cat of sortedCategories) {
      const gradeMap = catGradeMap.get(cat)!;
      const sortedGrades = sortGrades([...gradeMap.keys()], gradeFallback);
      for (const g of sortedGrades) {
        const p = gradeMap.get(g)!;
        rows.push({ key: `${cat}::${g}`, category: cat, grade: g, pitam: p, total: p.WITH_PITAM + p.WITHOUT_PITAM + p.MIXED });
      }
    }
    return {
      summary: { key, label, pitam, total },
      entry: { key, label, showCategoryColumn: true, rows, grandPitam: pitam, grandTotal: total },
    };
  };

  const summaryRows: SummaryRow[] = [];
  const breakdown: BreakdownEntry[] = [];

  const sortedGeneralCats = sortCategoryNames([...generalCatPitam.keys()], traderCategoryOrder);
  for (const catName of sortedGeneralCats) {
    const { summary, entry } = buildGeneralBreakdown(
      `category:${catName}`,
      catName,
      generalCatPitam.get(catName)!,
      generalCatGrades.get(catName)!,
    );
    summaryRows.push(summary);
    breakdown.push(entry);
  }

  const privateTotal = privatePitam.WITH_PITAM + privatePitam.WITHOUT_PITAM + privatePitam.MIXED;
  const hasSomething = privateTotal > 0 || summaryRows.length > 0 || generalCatPitam.size > 0;
  if (hasSomething) {
    const { summary, entry } = buildCategoryGradeBreakdown(
      'private',
      privateSortingLabel,
      privatePitam,
      privateCatGrade,
      traderCategoryOrder,
    );
    summaryRows.push({ ...summary, isSeparator: summaryRows.length > 0 });
    breakdown.push(entry);
  }

  const { summary: custSummary, entry: custEntry } = buildCategoryGradeBreakdown(
    'customers',
    customersLabel,
    customerPitam,
    customerCatGrade,
    null,
  );
  summaryRows.push(custSummary);
  breakdown.push(custEntry);

  return { summaryRows, breakdown };
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
  const fmt = useMemo(() => {
    const nf = new Intl.NumberFormat(locale);
    return (n: number) => nf.format(Math.abs(n));
  }, [locale]);

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  const { summaryRows, breakdown } = useMemo(
    () =>
      buildSortingData(
        rows,
        labels.rows.privateSorting,
        labels.rows.customers,
        labels.breakdown.grade,
        labels.breakdown.noCategory,
        traderCategoryOrder,
      ),
    [rows, labels.rows.privateSorting, labels.rows.customers, labels.breakdown.grade, labels.breakdown.noCategory, traderCategoryOrder],
  );

  const grandTotal: PitamTotals = useMemo(
    () =>
      summaryRows.reduce(
        (acc, row) => ({
          WITH_PITAM: acc.WITH_PITAM + row.pitam.WITH_PITAM,
          WITHOUT_PITAM: acc.WITHOUT_PITAM + row.pitam.WITHOUT_PITAM,
          MIXED: acc.MIXED + row.pitam.MIXED,
        }),
        { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 },
      ),
    [summaryRows],
  );

  const grandTotalSum = grandTotal.WITH_PITAM + grandTotal.WITHOUT_PITAM + grandTotal.MIXED;
  const hasData = grandTotalSum > 0;

  const handlePrint = useCallback(() => {
    printHarvestSortingSummary({ lang, labels, summaryRows, grandTotal, breakdown, seasonLabel });
  }, [lang, labels, summaryRows, grandTotal, breakdown, seasonLabel]);

  const handleExport = useCallback(async () => {
    try {
      await exportHarvestSortingSummaryToExcel({ lang, labels, summaryRows, grandTotal, breakdown, seasonLabel });
    } catch {
      window.alert(labels.exportError);
    }
  }, [lang, labels, summaryRows, grandTotal, breakdown, seasonLabel]);

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
        actions={hasData ? (
          <div className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`} aria-label={labels.actionsLabel}>
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
              onClick={() => { void handleExport(); }}
              aria-label={labels.exportAriaLabel}
              title={labels.exportTitle}
            >
              <FaFileArrowDown />
            </button>
          </div>
        ) : undefined}
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
            <div className={styles.matrixViewport}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.rowLabelHead}>{labels.columns.category}</th>
                    <th>{labels.columns.withPitam}</th>
                    <th>{labels.columns.withoutPitam}</th>
                    <th>{labels.columns.mixed}</th>
                    <th className={styles.totalHead}>{labels.columns.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={row.key} className={row.isSeparator ? styles.separatorRow : undefined}>
                      <th className={styles.rowLabelCell}>{row.label}</th>
                      <td>{fmt(row.pitam.WITH_PITAM)}</td>
                      <td>{fmt(row.pitam.WITHOUT_PITAM)}</td>
                      <td>{fmt(row.pitam.MIXED)}</td>
                      <td className={styles.totalCell}>{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th className={styles.rowLabelCell}>{labels.rows.grandTotal}</th>
                    <td>{fmt(grandTotal.WITH_PITAM)}</td>
                    <td>{fmt(grandTotal.WITHOUT_PITAM)}</td>
                    <td>{fmt(grandTotal.MIXED)}</td>
                    <td className={styles.totalCell}>{fmt(grandTotalSum)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className={styles.breakdownPanel}>
            <button
              type="button"
              className={`${styles.breakdownToggle}${isBreakdownOpen ? ` ${styles.breakdownToggleOpen}` : ''}`}
              onClick={() => setIsBreakdownOpen((o) => !o)}
            >
              {isBreakdownOpen ? labels.breakdown.hideBreakdown : labels.breakdown.showBreakdown}
              <span className={`${styles.breakdownArrow}${isBreakdownOpen ? ` ${styles.breakdownArrowOpen}` : ''}`}>▼</span>
            </button>
            {isBreakdownOpen ? (
              <div className={styles.breakdownContent}>
                <h3 className={styles.breakdownTitle}>{labels.breakdown.breakdownTitle}</h3>
                <div className={styles.categoryTablesStack}>
                  {breakdown.map((entry) => {
                    const colSpanEmpty = entry.showCategoryColumn ? 6 : 5;
                    return (
                      <div key={entry.key} className={styles.tableSection}>
                        <h4 className={styles.tableTitle}>{entry.label}</h4>
                        <div className={styles.matrixViewport}>
                          <table className={styles.matrixTable}>
                            <thead>
                              <tr>
                                {entry.showCategoryColumn ? (
                                  <th className={styles.rowLabelHead}>{labels.breakdown.category}</th>
                                ) : null}
                                <th className={entry.showCategoryColumn ? undefined : styles.rowLabelHead}>
                                  {labels.breakdown.grade}
                                </th>
                                <th>{labels.columns.withPitam}</th>
                                <th>{labels.columns.withoutPitam}</th>
                                <th>{labels.columns.mixed}</th>
                                <th className={styles.totalHead}>{labels.columns.total}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.rows.length > 0 ? entry.rows.map((r) => (
                                <tr key={r.key}>
                                  {entry.showCategoryColumn ? (
                                    <th className={styles.rowLabelCell}>{r.category}</th>
                                  ) : null}
                                  <td className={entry.showCategoryColumn ? styles.gradeCell : undefined}>
                                    <strong>{r.grade}</strong>
                                  </td>
                                  <td>{fmt(r.pitam.WITH_PITAM)}</td>
                                  <td>{fmt(r.pitam.WITHOUT_PITAM)}</td>
                                  <td>{fmt(r.pitam.MIXED)}</td>
                                  <td className={styles.totalCell}>{fmt(r.total)}</td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={colSpanEmpty} style={{ textAlign: 'center', color: 'var(--color-text-secondary, #888)' }}>—</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th
                                  className={styles.rowLabelCell}
                                  colSpan={entry.showCategoryColumn ? 2 : 1}
                                >
                                  {labels.columns.total}
                                </th>
                                <td>{fmt(entry.grandPitam.WITH_PITAM)}</td>
                                <td>{fmt(entry.grandPitam.WITHOUT_PITAM)}</td>
                                <td>{fmt(entry.grandPitam.MIXED)}</td>
                                <td className={styles.totalCell}>{fmt(entry.grandTotal)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
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
