import { useMemo } from 'react';
import type { ReactNode, RefObject } from 'react';
import { FaScaleBalanced, FaUserTie, FaLayerGroup, FaMapPin, FaFilter } from 'react-icons/fa6';
import type { AppLang, TraderInventoryI18n } from '../i18n';
import type { TraderInventorySummaryRow, TraderInventorySummaryTotals } from '../traderInventory.types';
import {
  getTraderInventoryPitamStatusLabel,
} from '../utils/traderInventorySummary.util';
import { buildTraderInventorySummaryMatrix } from '../utils/traderInventorySummaryMatrix.util';
import {
  CategoryGradeMatrixTable,
  type MatrixRow,
  type PitamGradeCell,
} from '../../harvest/components/shared/CategoryGradeMatrixTable';
import styles from './styles/TraderInventoryAllSection.module.css';

const EMPTY_PITAM_TOTALS = { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 } as const;

function toPitamCell(totals: Record<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED', number>): PitamGradeCell {
  return {
    withPitam: Math.abs(totals.WITH_PITAM),
    withoutPitam: Math.abs(totals.WITHOUT_PITAM),
    mixed: Math.abs(totals.MIXED),
  };
}

type TraderInventoryAllSectionProps = {
  lang: AppLang;
  labels: TraderInventoryI18n['summary'];
  filtersBar?: ReactNode;
  rows: TraderInventorySummaryRow[];
  totals: TraderInventorySummaryTotals;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  tableRef?: RefObject<HTMLTableElement>;
  traderCategoryOrder?: Map<string, number>;
  // "Transferred to customers" shows customer-bound stock - the trader/modulo split is
  // meaningless there (it's neither "trader inventory" nor "unassigned inventory" anymore,
  // it's customer inventory), so those two cards are left blank instead of showing numbers.
  hideTraderModuloBreakdown?: boolean;
};

export function TraderInventoryAllSection({
  lang,
  labels,
  filtersBar,
  rows,
  totals,
  isLoading,
  error,
  onRetry,
  tableRef,
  traderCategoryOrder,
  hideTraderModuloBreakdown,
}: TraderInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const summaryMatrix = useMemo(
    () => buildTraderInventorySummaryMatrix(rows, labels.values.none, traderCategoryOrder),
    [labels.values.none, rows, traderCategoryOrder],
  );

  const columnLabels = useMemo(
    () => ({
      withPitam: getTraderInventoryPitamStatusLabel('WITH_PITAM', labels),
      withoutPitam: getTraderInventoryPitamStatusLabel('WITHOUT_PITAM', labels),
      mixed: getTraderInventoryPitamStatusLabel('MIXED', labels),
    }),
    [labels],
  );

  const mainMatrixRows: MatrixRow[] = useMemo(
    () =>
      summaryMatrix.categories.map((category) => ({
        key: category.key,
        label: category.label,
        cells: Object.fromEntries(
          summaryMatrix.grades.map((grade) => [
            grade,
            toPitamCell(summaryMatrix.gradeValues[grade]?.[category.key] ?? EMPTY_PITAM_TOTALS),
          ]),
        ),
      })),
    [summaryMatrix.categories, summaryMatrix.grades, summaryMatrix.gradeValues],
  );

  const mainGrandTotalRow = useMemo(
    () => ({
      label: labels.matrix.total,
      cells: Object.fromEntries(
        summaryMatrix.grades.map((grade) => {
          const gradeTotals = { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
          for (const category of summaryMatrix.categories) {
            const cell = summaryMatrix.gradeValues[grade]?.[category.key];
            if (!cell) continue;
            gradeTotals.WITH_PITAM += cell.WITH_PITAM;
            gradeTotals.WITHOUT_PITAM += cell.WITHOUT_PITAM;
            gradeTotals.MIXED += cell.MIXED;
          }
          return [grade, toPitamCell(gradeTotals)];
        }),
      ),
    }),
    [labels.matrix.total, summaryMatrix.grades, summaryMatrix.categories, summaryMatrix.gradeValues],
  );

  return (
    <section className={styles.section}>
      <section className={styles.explainerSection}>
        <p className={styles.focusedExplanation}>{labels.focusedExplanation}</p>
      </section>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaScaleBalanced aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.totalQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.totalQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaUserTie aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.traderQuantity}</span>
          <strong className={styles.summaryValue}>{hideTraderModuloBreakdown ? '—' : numberFormatter.format(Math.abs(totals.traderQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaFilter aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.privateSelectionQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.privateSelectionQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaLayerGroup aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.moduloQuantity}</span>
          <strong className={styles.summaryValue}>{hideTraderModuloBreakdown ? '—' : numberFormatter.format(Math.abs(totals.moduloQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaMapPin aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.remainsInItalyQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.remainsInItalyQuantity))}</strong>
          <span className={styles.summaryNote}>{labels.totals.remainsInItalyNote}</span>
        </article>
      </div>

      {filtersBar ? <section className={styles.filtersBarSection}>{filtersBar}</section> : null}

      {isLoading && rows.length === 0 ? (
        <div className={styles.loadingText}>{labels.loading}</div>
      ) : null}

      {!isLoading && summaryMatrix.categories.length === 0 && !error ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {summaryMatrix.categories.length > 0 ? (
        <section className={styles.matrixSection}>
          <h3 className={styles.matrixTitle}>{labels.matrix.title}</h3>
          <CategoryGradeMatrixTable
            lang={lang}
            rows={mainMatrixRows}
            grades={summaryMatrix.grades}
            grandTotalRow={mainGrandTotalRow}
            categoryColumnLabel={labels.columns.category}
            totalColumnLabel={labels.matrix.total}
            emptyLabel={labels.empty}
            columnLabels={columnLabels}
            tableRef={tableRef}
          />
        </section>
      ) : null}

      {error ? (
        <div className={`${styles.statusBox} ${styles.statusError}`}>
          <div>{error || labels.loadFailed}</div>
          <button type="button" className={`btn btn-primary ${styles.retryButton}`} onClick={onRetry}>
            {labels.retry}
          </button>
        </div>
      ) : null}
    </section>
  );
}
