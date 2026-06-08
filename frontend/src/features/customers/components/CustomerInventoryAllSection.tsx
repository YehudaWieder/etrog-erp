import { useMemo } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { CustomerInventoryI18n } from '../i18n.inventory';
import type {
  CustomerInventoryPitamStatus,
  CustomerInventorySummaryRow,
  CustomerInventorySummaryTotals,
} from '../customerInventory.types';
import { buildCustomerInventorySummaryMatrix } from '../utils/customerInventorySummaryMatrix.util';
import traderStyles from '../../traders/components/styles/TraderInventoryAllSection.module.css';

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
};

const PITAM_ORDER: CustomerInventoryPitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

function getPitamStatusLabel(
  pitamStatus: CustomerInventoryPitamStatus,
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
}: CustomerInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const summaryMatrix = useMemo(
    () => buildCustomerInventorySummaryMatrix(rows, labels.values.none),
    [labels.values.none, rows],
  );

  if (isLoading && rows.length === 0) {
    return <div className={traderStyles.statusBox}>{labels.loading}</div>;
  }

  if (error && rows.length === 0) {
    return (
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
    );
  }

  return (
    <section className={traderStyles.section}>
      <section className={traderStyles.explainerSection}>
        <p className={traderStyles.focusedExplanation}>{labels.focusedExplanation}</p>
      </section>

      <div className={traderStyles.summaryGrid}>
        <article className={traderStyles.summaryCard}>
          <span className={traderStyles.summaryLabel}>{labels.totals.totalQuantity}</span>
          <strong className={traderStyles.summaryValue}>
            {numberFormatter.format(Math.abs(totals.totalQuantity))}
          </strong>
        </article>
      </div>

      {filtersBar ? <section className={traderStyles.filtersBarSection}>{filtersBar}</section> : null}

      {!isLoading && summaryMatrix.categories.length === 0 && !error ? (
        <div className={traderStyles.statusBox}>{labels.empty}</div>
      ) : null}

      {summaryMatrix.categories.length > 0 ? (
        <section className={traderStyles.matrixSection}>
          <div className={traderStyles.matrixViewport}>
            <table className={traderStyles.matrixTable} ref={tableRef}>
              <thead>
                <tr>
                  <th className={traderStyles.matrixGradeHead}>{labels.matrix.grade}</th>
                  {summaryMatrix.categories.map((category) => (
                    <th
                      key={category.key}
                      colSpan={4}
                      className={traderStyles.matrixGroupHead}
                    >
                      <span className={traderStyles.matrixGroupHeadInline}>
                        <span className={traderStyles.matrixGroupHeadTitle}>{category.label}</span>
                        <span className={traderStyles.matrixGroupHeadTotal}>
                          {numberFormatter.format(Math.abs(category.total))}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th className={traderStyles.matrixGrandTotalHead}>{labels.matrix.total}</th>
                </tr>
                <tr>
                  <th
                    aria-hidden="true"
                    className={`${traderStyles.matrixGradeHead} ${traderStyles.matrixSubHeadSpacer}`}
                  />
                  {summaryMatrix.categories.flatMap((category) => {
                    return PITAM_ORDER.map((pitamStatus) => (
                      <th key={`${category.key}:${pitamStatus}`}>
                        <span className={traderStyles.matrixSubHeadLabel}>
                          {getPitamStatusLabel(pitamStatus, labels)}
                        </span>
                      </th>
                    )).concat(
                      <th
                        key={`${category.key}:total`}
                        className={traderStyles.matrixInnerTotalHead}
                      >
                        <span className={traderStyles.matrixSubHeadLabel}>
                          {labels.matrix.total}
                        </span>
                      </th>,
                    );
                  })}
                  <th
                    aria-hidden="true"
                    className={`${traderStyles.matrixGrandTotalHead} ${traderStyles.matrixSubHeadSpacer}`}
                  />
                </tr>
              </thead>
              <tbody>
                {summaryMatrix.grades.map((grade) => (
                  <tr key={grade}>
                    <th className={traderStyles.matrixGradeCell}>{grade}</th>
                    {summaryMatrix.categories.flatMap((category) => {
                      const gradeCell = summaryMatrix.gradeValues[grade]?.[category.key] ?? {
                        WITH_PITAM: 0,
                        WITHOUT_PITAM: 0,
                        MIXED: 0,
                      };
                      const gradeCategoryTotal =
                        gradeCell.WITH_PITAM +
                        gradeCell.WITHOUT_PITAM +
                        gradeCell.MIXED;

                      return [
                        <td key={`${grade}:${category.key}:WITH_PITAM`}>
                          {numberFormatter.format(Math.abs(gradeCell.WITH_PITAM))}
                        </td>,
                        <td key={`${grade}:${category.key}:WITHOUT_PITAM`}>
                          {numberFormatter.format(Math.abs(gradeCell.WITHOUT_PITAM))}
                        </td>,
                        <td key={`${grade}:${category.key}:MIXED`}>
                          {numberFormatter.format(Math.abs(gradeCell.MIXED))}
                        </td>,
                        <td
                          key={`${grade}:${category.key}:TOTAL`}
                          className={`${traderStyles.matrixCellStrong} ${traderStyles.matrixInnerTotalCell}`}
                        >
                          {numberFormatter.format(Math.abs(gradeCategoryTotal))}
                        </td>,
                      ];
                    })}
                    <td
                      className={`${traderStyles.matrixCellStrong} ${traderStyles.matrixGrandTotalCell}`}
                    >
                      {numberFormatter.format(Math.abs(summaryMatrix.rowTotals[grade] ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className={traderStyles.matrixGradeCell}>{labels.matrix.total}</th>
                  {summaryMatrix.categories.flatMap((category) => [
                    <td
                      key={`total:${category.key}:WITH_PITAM`}
                      className={traderStyles.matrixCellStrong}
                    >
                      {numberFormatter.format(
                        Math.abs(category.totalsByPitamStatus.WITH_PITAM),
                      )}
                    </td>,
                    <td
                      key={`total:${category.key}:WITHOUT_PITAM`}
                      className={traderStyles.matrixCellStrong}
                    >
                      {numberFormatter.format(
                        Math.abs(category.totalsByPitamStatus.WITHOUT_PITAM),
                      )}
                    </td>,
                    <td
                      key={`total:${category.key}:MIXED`}
                      className={traderStyles.matrixCellStrong}
                    >
                      {numberFormatter.format(
                        Math.abs(category.totalsByPitamStatus.MIXED),
                      )}
                    </td>,
                    <td
                      key={`total:${category.key}:TOTAL`}
                      className={`${traderStyles.matrixCellStrong} ${traderStyles.matrixInnerTotalCell}`}
                    >
                      {numberFormatter.format(Math.abs(category.total))}
                    </td>,
                  ])}
                  <td
                    className={`${traderStyles.matrixCellStrong} ${traderStyles.matrixGrandTotalCell}`}
                  >
                    {numberFormatter.format(Math.abs(summaryMatrix.grandTotal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
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
