import { useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { FaScaleBalanced } from 'react-icons/fa6';
import type { CustomerInventoryI18n } from '../i18n.inventory';
import type {
  CustomerInventorySummaryRow,
  CustomerInventorySummaryTotals,
} from '../customerInventory.types';
import { buildCustomerInventorySummaryMatrixByCustomer } from '../utils/customerInventorySummaryMatrix.util';
import traderStyles from '../../traders/components/styles/TraderInventoryAllSection.module.css';
import styles from './styles/CustomerInventoryAllSection.module.css';

type DefinedCustomerCategory = {
  id: number;
  customerId: number;
  name: string;
  grade: string;
};

type CustomerInventoryAllSectionProps = {
  lang: 'he' | 'en';
  labels: CustomerInventoryI18n['summary'];
  filtersBar?: ReactNode;
  rows: CustomerInventorySummaryRow[];
  totals: CustomerInventorySummaryTotals;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  tableRef?: RefObject<HTMLTableElement>;
  customerCategories?: DefinedCustomerCategory[];
};

function getPitamStatusLabel(
  pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED',
  labels: CustomerInventoryI18n['summary'],
) {
  return labels.values.pitamStatus[pitamStatus] ?? pitamStatus;
}

export function CustomerInventoryAllSection({
  lang,
  labels,
  filtersBar,
  rows,
  totals,
  isLoading,
  error,
  onRetry,
  tableRef,
  customerCategories = [],
}: CustomerInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = (n: number) => numberFormatter.format(Math.abs(n));

  const summaryMatrix = useMemo(
    () => buildCustomerInventorySummaryMatrixByCustomer(rows, labels.values.none, customerCategories),
    [labels.values.none, rows, customerCategories],
  );

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  return (
    <section className={traderStyles.section}>
      <section className={traderStyles.explainerSection}>
        <p className={traderStyles.focusedExplanation}>{labels.focusedExplanation}</p>
      </section>

      <div className={traderStyles.summaryGrid}>
        <article className={traderStyles.summaryCard}>
          <div className={traderStyles.summaryIcon}><FaScaleBalanced aria-hidden="true" /></div>
          <span className={traderStyles.summaryLabel}>{labels.totals.totalQuantity}</span>
          <strong className={traderStyles.summaryValue}>
            {numberFormatter.format(Math.abs(totals.totalQuantity))}
          </strong>
        </article>
      </div>

      {filtersBar ? <section className={traderStyles.filtersBarSection}>{filtersBar}</section> : null}

      {isLoading && rows.length === 0 ? (
        <div className={traderStyles.loadingText}>{labels.loading}</div>
      ) : null}

      {!isLoading && summaryMatrix.customers.length === 0 && !error ? (
        <div className={traderStyles.statusBox}>{labels.empty}</div>
      ) : null}

      {summaryMatrix.customers.length > 0 ? (
        <>
          <section className={traderStyles.matrixSection}>
            <div className={traderStyles.matrixViewport}>
              <table className={traderStyles.matrixTable} ref={tableRef}>
                <thead>
                  <tr>
                    <th className={traderStyles.matrixTypeHead}>{labels.columns.customer}</th>
                    <th>{getPitamStatusLabel('WITH_PITAM', labels)}</th>
                    <th>{getPitamStatusLabel('WITHOUT_PITAM', labels)}</th>
                    <th>{getPitamStatusLabel('MIXED', labels)}</th>
                    <th className={traderStyles.matrixTotalHead}>{labels.matrix.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryMatrix.customers.map((customer) => (
                    <tr key={customer.customerId}>
                      <th className={traderStyles.matrixTypeCell}>{customer.customerName}</th>
                      <td>{fmt(customer.totalsByPitamStatus.WITH_PITAM)}</td>
                      <td>{fmt(customer.totalsByPitamStatus.WITHOUT_PITAM)}</td>
                      <td>{fmt(customer.totalsByPitamStatus.MIXED)}</td>
                      <td className={traderStyles.matrixTotalCell}>{fmt(customer.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th className={traderStyles.matrixTypeCell}>{labels.matrix.total}</th>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.WITH_PITAM)}</td>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.WITHOUT_PITAM)}</td>
                    <td>{fmt(summaryMatrix.grandTotalByPitamStatus.MIXED)}</td>
                    <td className={traderStyles.matrixTotalCell}>{fmt(summaryMatrix.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className={traderStyles.breakdownPanel}>
            <button
              type="button"
              className={`${traderStyles.breakdownToggle}${isBreakdownOpen ? ` ${traderStyles.breakdownToggleOpen}` : ''}`}
              onClick={() => setIsBreakdownOpen((o) => !o)}
            >
              {isBreakdownOpen ? labels.breakdown.hideBreakdown : labels.breakdown.showBreakdown}
              <span className={`${traderStyles.breakdownArrow}${isBreakdownOpen ? ` ${traderStyles.breakdownArrowOpen}` : ''}`}>▼</span>
            </button>
            {isBreakdownOpen && (
              <div className={traderStyles.breakdownContent}>
                <h3 className={traderStyles.breakdownTitle}>{labels.breakdown.breakdownTitle}</h3>
                <div className={traderStyles.categoryTablesStack}>
                  {summaryMatrix.customers.map((customer) => (
                    <div key={customer.customerId} className={traderStyles.tableSection}>
                      <h3 className={styles.customerSectionTitle}>{customer.customerName}</h3>
                      <div className={traderStyles.matrixViewport}>
                        <table className={traderStyles.matrixTable}>
                          <thead>
                            <tr>
                              <th className={traderStyles.matrixTypeHead}>{labels.columns.category}</th>
                              <th className={traderStyles.matrixTypeHead}>{labels.matrix.grade}</th>
                              <th>{getPitamStatusLabel('WITH_PITAM', labels)}</th>
                              <th>{getPitamStatusLabel('WITHOUT_PITAM', labels)}</th>
                              <th>{getPitamStatusLabel('MIXED', labels)}</th>
                              <th className={traderStyles.matrixTotalHead}>{labels.matrix.total}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customer.categories.map((category) => (
                              <tr key={category.key}>
                                <th className={traderStyles.matrixTypeCell}>{category.label}</th>
                                <td>{category.grade}</td>
                                <td>{fmt(category.totalsByPitamStatus.WITH_PITAM)}</td>
                                <td>{fmt(category.totalsByPitamStatus.WITHOUT_PITAM)}</td>
                                <td>{fmt(category.totalsByPitamStatus.MIXED)}</td>
                                <td className={traderStyles.matrixTotalCell}>{fmt(category.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th className={traderStyles.matrixTypeCell} colSpan={2}>{labels.matrix.total}</th>
                              <td>{fmt(customer.totalsByPitamStatus.WITH_PITAM)}</td>
                              <td>{fmt(customer.totalsByPitamStatus.WITHOUT_PITAM)}</td>
                              <td>{fmt(customer.totalsByPitamStatus.MIXED)}</td>
                              <td className={traderStyles.matrixTotalCell}>{fmt(customer.total)}</td>
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
        <div className={`${traderStyles.statusBox} ${traderStyles.statusError}`}>
          <div>{error || labels.loadFailed}</div>
          <button
            type="button"
            className={`btn btn-primary ${traderStyles.retryButton}`}
            onClick={onRetry}
          >
            {labels.retry}
          </button>
        </div>
      ) : null}
    </section>
  );
}
