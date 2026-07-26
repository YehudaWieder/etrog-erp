import { useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { FaScaleBalanced, FaUserTie, FaLayerGroup, FaMapPin } from 'react-icons/fa6';
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
  tableRef?: RefObject<HTMLTableElement>;
  traderCategoryOrder?: Map<string, number>;
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
}: TraderInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = (n: number) => numberFormatter.format(Math.abs(n));

  const summaryMatrix = useMemo(
    () => buildTraderInventorySummaryMatrix(rows, labels.values.none, traderCategoryOrder),
    [labels.values.none, rows, traderCategoryOrder],
  );

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

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
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.traderQuantity))}</strong>
        </article>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}><FaLayerGroup aria-hidden="true" /></div>
          <span className={styles.summaryLabel}>{labels.totals.moduloQuantity}</span>
          <strong className={styles.summaryValue}>{numberFormatter.format(Math.abs(totals.moduloQuantity))}</strong>
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
        <>
          <section className={styles.matrixSection}>
            <h3 className={styles.matrixTitle}>{labels.matrix.title}</h3>
            <div className={styles.matrixViewport}>
              <table className={styles.matrixTable} ref={tableRef}>
                <thead>
                  <tr>
                    <th className={styles.matrixTypeHead}>{labels.columns.category}</th>
                    <th>{getTraderInventoryPitamStatusLabel('WITH_PITAM', labels)}</th>
                    <th>{getTraderInventoryPitamStatusLabel('WITHOUT_PITAM', labels)}</th>
                    <th>{getTraderInventoryPitamStatusLabel('MIXED', labels)}</th>
                    <th className={styles.matrixTotalHead}>{labels.matrix.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryMatrix.categories.map((category) => (
                    <tr key={category.key}>
                      <th className={styles.matrixTypeCell}>{category.label}</th>
                      <td>{fmt(category.totalsByPitamStatus.WITH_PITAM)}</td>
                      <td>{fmt(category.totalsByPitamStatus.WITHOUT_PITAM)}</td>
                      <td>{fmt(category.totalsByPitamStatus.MIXED)}</td>
                      <td className={styles.matrixTotalCell}>{fmt(category.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th className={styles.matrixTypeCell}>{labels.matrix.total}</th>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.WITH_PITAM)}</td>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.WITHOUT_PITAM)}</td>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.MIXED)}</td>
                    <td className={styles.matrixTotalCell}>{fmt(summaryMatrix.grandTotal)}</td>
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
            {isBreakdownOpen && (
              <div className={styles.breakdownContent}>
                <h3 className={styles.breakdownTitle}>{labels.breakdown.breakdownTitle}</h3>
                <div className={styles.categoryTablesStack}>
                  {summaryMatrix.categories.map((category) => (
                    <div key={category.key} className={styles.tableSection}>
                      <h4 className={styles.tableTitle}>{category.label}</h4>
                      <div className={styles.matrixViewport}>
                        <table className={styles.matrixTable}>
                          <thead>
                            <tr>
                              <th className={styles.matrixTypeHead}>{labels.matrix.grade}</th>
                              <th>{getTraderInventoryPitamStatusLabel('WITH_PITAM', labels)}</th>
                              <th>{getTraderInventoryPitamStatusLabel('WITHOUT_PITAM', labels)}</th>
                              <th>{getTraderInventoryPitamStatusLabel('MIXED', labels)}</th>
                              <th className={styles.matrixTotalHead}>{labels.matrix.total}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryMatrix.grades.map((grade) => {
                              const cell = summaryMatrix.gradeValues[grade]?.[category.key] ?? {
                                WITH_PITAM: 0,
                                WITHOUT_PITAM: 0,
                                MIXED: 0,
                              };
                              const gradeTotal = cell.WITH_PITAM + cell.WITHOUT_PITAM + cell.MIXED;
                              return (
                                <tr key={grade}>
                                  <th className={styles.matrixTypeCell}>{grade}</th>
                                  <td>{fmt(cell.WITH_PITAM)}</td>
                                  <td>{fmt(cell.WITHOUT_PITAM)}</td>
                                  <td>{fmt(cell.MIXED)}</td>
                                  <td className={styles.matrixTotalCell}>{fmt(gradeTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th className={styles.matrixTypeCell}>{labels.matrix.total}</th>
                              <td>{fmt(category.totalsByPitamStatus.WITH_PITAM)}</td>
                              <td>{fmt(category.totalsByPitamStatus.WITHOUT_PITAM)}</td>
                              <td>{fmt(category.totalsByPitamStatus.MIXED)}</td>
                              <td className={styles.matrixTotalCell}>{fmt(category.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
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
