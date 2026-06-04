import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppLang, TraderInventoryI18n } from '../i18n';
import type { TraderInventorySummaryRow, TraderInventorySummaryTotals } from '../traderInventory.types';
import {
  getTraderInventoryPitamStatusLabel,
} from '../utils/traderInventorySummary.util';
import { buildTraderInventorySummaryMatrix } from '../utils/traderInventorySummaryMatrix.util';
import styles from './styles/TraderInventoryAllSection.module.css';

type TraderInventoryAllSectionProps = {
  lang: AppLang;
  labels: TraderInventoryI18n['summary'];
  filtersBar?: ReactNode;
  rows: TraderInventorySummaryRow[];
  totals: TraderInventorySummaryTotals;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
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
}: TraderInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const summaryMatrix = useMemo(
    () => buildTraderInventorySummaryMatrix(rows, labels.values.none),
    [labels.values.none, rows],
  );

  if (isLoading && rows.length === 0) {
    return <div className={styles.statusBox}>{labels.loading}</div>;
  }

  if (error && rows.length === 0) {
    return (
      <div className={`${styles.statusBox} ${styles.statusError}`}>
        <div>{error || labels.loadFailed}</div>
        <button type="button" className={`btn btn-primary ${styles.retryButton}`} onClick={onRetry}>
          {labels.retry}
        </button>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <section className={styles.explainerSection}>
        <p className={styles.focusedExplanation}>{labels.focusedExplanation}</p>
      </section>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{labels.totals.totalQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.totalQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{labels.totals.traderQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.traderQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{labels.totals.moduloQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.moduloQuantity))}</strong>
        </article>
      </div>

      {filtersBar ? <section className={styles.filtersBarSection}>{filtersBar}</section> : null}

      {!isLoading && summaryMatrix.categories.length === 0 && !error ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {summaryMatrix.categories.length > 0 ? (
        <section className={styles.matrixSection}>
          <div className={styles.matrixViewport}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={styles.matrixGradeHead}>{labels.matrix.grade}</th>
                  {summaryMatrix.categories.map((category) => (
                    <th key={category.key} colSpan={4} className={styles.matrixGroupHead}>
                      <span className={styles.matrixGroupHeadInline}>
                        <span className={styles.matrixGroupHeadTitle}>{category.label}</span>
                        <span className={styles.matrixGroupHeadTotal}>{numberFormatter.format(Math.abs(category.total))}</span>
                      </span>
                    </th>
                  ))}
                  <th className={styles.matrixGrandTotalHead}>{labels.matrix.total}</th>
                </tr>
                <tr>
                  <th aria-hidden="true" className={`${styles.matrixGradeHead} ${styles.matrixSubHeadSpacer}`} />
                  {summaryMatrix.categories.flatMap((category) => {
                    return (['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'] as const)
                      .map((pitamStatus) => (
                        <th key={`${category.key}:${pitamStatus}`}>
                          <span className={styles.matrixSubHeadLabel}>{getTraderInventoryPitamStatusLabel(pitamStatus, labels)}</span>
                        </th>
                      ))
                      .concat(
                        <th key={`${category.key}:total`} className={styles.matrixInnerTotalHead}>
                          <span className={styles.matrixSubHeadLabel}>{labels.matrix.total}</span>
                        </th>,
                      );
                  })}
                  <th aria-hidden="true" className={`${styles.matrixGrandTotalHead} ${styles.matrixSubHeadSpacer}`} />
                </tr>
              </thead>
              <tbody>
                {summaryMatrix.grades.map((grade) => (
                  <tr key={grade}>
                    <th className={styles.matrixGradeCell}>{grade}</th>
                    {summaryMatrix.categories.flatMap((category) => {
                      const gradeCell = summaryMatrix.gradeValues[grade]?.[category.key] ?? {
                        WITH_PITAM: 0,
                        WITHOUT_PITAM: 0,
                        MIXED: 0,
                      };
                      const gradeCategoryTotal = gradeCell.WITH_PITAM + gradeCell.WITHOUT_PITAM + gradeCell.MIXED;

                      return [
                        <td key={`${grade}:${category.key}:WITH_PITAM`}>{numberFormatter.format(Math.abs(gradeCell.WITH_PITAM))}</td>,
                        <td key={`${grade}:${category.key}:WITHOUT_PITAM`}>{numberFormatter.format(Math.abs(gradeCell.WITHOUT_PITAM))}</td>,
                        <td key={`${grade}:${category.key}:MIXED`}>{numberFormatter.format(Math.abs(gradeCell.MIXED))}</td>,
                        <td key={`${grade}:${category.key}:TOTAL`} className={`${styles.matrixCellStrong} ${styles.matrixInnerTotalCell}`}>{numberFormatter.format(Math.abs(gradeCategoryTotal))}</td>,
                      ];
                    })}
                    <td className={`${styles.matrixCellStrong} ${styles.matrixGrandTotalCell}`}>{numberFormatter.format(Math.abs(summaryMatrix.rowTotals[grade] ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className={styles.matrixGradeCell}>{labels.matrix.total}</th>
                  {summaryMatrix.categories.flatMap((category) => [
                    <td key={`total:${category.key}:WITH_PITAM`} className={styles.matrixCellStrong}>{numberFormatter.format(Math.abs(category.totalsByPitamStatus.WITH_PITAM))}</td>,
                    <td key={`total:${category.key}:WITHOUT_PITAM`} className={styles.matrixCellStrong}>{numberFormatter.format(Math.abs(category.totalsByPitamStatus.WITHOUT_PITAM))}</td>,
                    <td key={`total:${category.key}:MIXED`} className={styles.matrixCellStrong}>{numberFormatter.format(Math.abs(category.totalsByPitamStatus.MIXED))}</td>,
                    <td key={`total:${category.key}:TOTAL`} className={`${styles.matrixCellStrong} ${styles.matrixInnerTotalCell}`}>{numberFormatter.format(Math.abs(category.total))}</td>,
                  ])}
                  <td className={`${styles.matrixCellStrong} ${styles.matrixGrandTotalCell}`}>{numberFormatter.format(Math.abs(summaryMatrix.grandTotal))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
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