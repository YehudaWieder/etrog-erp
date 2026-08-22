import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  FaScaleBalanced,
  FaBoxOpen,
  FaBoxesStacked,
  FaTruckFast,
} from 'react-icons/fa6';
import type { IsraelStockRecord } from '../../../../../services/israel/israelStockApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type { IsraelInventoryI18n } from '../../i18n';
import { HARVEST_GRADE_OPTIONS } from '../../../../harvest/utils/harvestPage.utils';
import { CategoryGradeMatrixTable } from '../../../../harvest/components/shared/CategoryGradeMatrixTable';
import {
  buildStockStatusMatrix,
  type IsraelInventoryStatusScope,
  type StockStatusMatrix,
} from '../../utils/buildStockStatusMatrix.util';
import styles from '../../../../traders/components/styles/TraderInventoryAllSection.module.css';

function sumMatrixTotal(matrix: StockStatusMatrix): number {
  return matrix.rows.reduce((sum, row) => {
    const rowTotal = matrix.grades.reduce((gradeSum, grade) => {
      const cell = row.cells[grade];
      if (!cell) return gradeSum;
      return gradeSum + cell.withPitam + cell.withoutPitam + cell.mixed;
    }, 0);
    return sum + rowTotal;
  }, 0);
}

type IsraelInventoryAllSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelInventoryI18n['allInventory'];
  filtersBar?: ReactNode;
  rows: IsraelStockRecord[];
  statusScope: IsraelInventoryStatusScope;
  isLoading: boolean;
  loadError: string;
  onRetry?: () => void;
  sortCategories?: IsraelSortCategory[];
};

export function IsraelInventoryAllSection({
  lang,
  labels,
  filtersBar,
  rows,
  statusScope,
  isLoading,
  loadError,
  onRetry,
  sortCategories = [],
}: IsraelInventoryAllSectionProps) {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );

  const categoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of sortCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [sortCategories]);

  const allCategoryNames = useMemo(
    () => sortCategories.map((category) => category.name),
    [sortCategories],
  );

  const matrix = useMemo(
    () =>
      buildStockStatusMatrix(
        rows,
        statusScope,
        labels.totals.totalQuantity,
        labels.noGradeLabel,
        categoryOrder,
        allCategoryNames,
        HARVEST_GRADE_OPTIONS,
      ),
    [
      rows,
      statusScope,
      labels.totals.totalQuantity,
      labels.noGradeLabel,
      categoryOrder,
      allCategoryNames,
    ],
  );

  const hasData = matrix.rows.length > 0;

  const totalQuantity = useMemo(() => sumMatrixTotal(matrix), [matrix]);

  const buildScopeMatrix = (scope: IsraelInventoryStatusScope) =>
    buildStockStatusMatrix(
      rows,
      scope,
      labels.totals.totalQuantity,
      labels.noGradeLabel,
      categoryOrder,
      allCategoryNames,
      HARVEST_GRADE_OPTIONS,
    );

  const notPackedQuantity = useMemo(
    () => sumMatrixTotal(buildScopeMatrix('NOT_PACKED')),
    [
      rows,
      categoryOrder,
      allCategoryNames,
      labels.totals.totalQuantity,
      labels.noGradeLabel,
    ],
  );

  const packedQuantity = useMemo(
    () => sumMatrixTotal(buildScopeMatrix('PACKED')),
    [
      rows,
      categoryOrder,
      allCategoryNames,
      labels.totals.totalQuantity,
      labels.noGradeLabel,
    ],
  );

  const sentQuantity = useMemo(
    () => sumMatrixTotal(buildScopeMatrix('SENT')),
    [
      rows,
      categoryOrder,
      allCategoryNames,
      labels.totals.totalQuantity,
      labels.noGradeLabel,
    ],
  );

  return (
    <section className={styles.section}>
      <section className={styles.explainerSection}>
        <p className={styles.focusedExplanation}>{labels.description}</p>
      </section>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FaScaleBalanced aria-hidden="true" />
          </div>
          <span className={styles.summaryLabel}>
            {labels.totals.totalQuantity}
          </span>
          <strong className={styles.summaryValue}>
            {numberFormatter.format(totalQuantity)}
          </strong>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FaBoxOpen aria-hidden="true" />
          </div>
          <span className={styles.summaryLabel}>
            {labels.statusOptions.notPacked}
          </span>
          <strong className={styles.summaryValue}>
            {numberFormatter.format(notPackedQuantity)}
          </strong>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FaBoxesStacked aria-hidden="true" />
          </div>
          <span className={styles.summaryLabel}>
            {labels.statusOptions.packed}
          </span>
          <strong className={styles.summaryValue}>
            {numberFormatter.format(packedQuantity)}
          </strong>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FaTruckFast aria-hidden="true" />
          </div>
          <span className={styles.summaryLabel}>
            {labels.statusOptions.sent}
          </span>
          <strong className={styles.summaryValue}>
            {numberFormatter.format(sentQuantity)}
          </strong>
        </article>
      </div>

      {filtersBar ? (
        <section className={styles.filtersBarSection}>{filtersBar}</section>
      ) : null}

      {isLoading && rows.length === 0 ? (
        <div className={styles.loadingText}>{labels.loading}</div>
      ) : null}

      {!isLoading && !hasData && !loadError ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {hasData ? (
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
      ) : null}

      {loadError ? (
        <div className={`${styles.statusBox} ${styles.statusError}`}>
          <div>{loadError}</div>
          {onRetry ? (
            <button
              type="button"
              className={`btn btn-primary ${styles.retryButton}`}
              onClick={onRetry}
            >
              {labels.retry}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
