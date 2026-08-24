import { Fragment, useMemo } from 'react';
import type { RefObject } from 'react';
import styles from './CategoryGradeMatrixTable.module.css';

export type PitamGradeCell = {
  withPitam: number;
  withoutPitam: number;
  mixed: number;
};

export type MatrixRow = {
  key: string;
  label: string;
  cells: Record<string, PitamGradeCell>;
  variant?: 'separator' | 'subtotal';
};

type CategoryGradeMatrixTableProps = {
  lang: 'he' | 'en';
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow?: { label: string; cells: Record<string, PitamGradeCell> };
  categoryColumnLabel: string;
  totalColumnLabel: string;
  emptyLabel: string;
  columnLabels: {
    withPitam: string;
    withoutPitam: string;
    mixed: string;
  };
  /** Skip the top grade-label header row, for matrices with a single implicit grade (no grade dimension). */
  hideGradeHeader?: boolean;
  /** Hide the withPitam/withoutPitam/mixed sub-columns for a grade when no row has data in them. Default true. */
  collapseEmptyPitamColumns?: boolean;
  tableRef?: RefObject<HTMLTableElement>;
};

const EMPTY_CELL: PitamGradeCell = { withPitam: 0, withoutPitam: 0, mixed: 0 };

type GradeColumns = {
  withPitam: boolean;
  withoutPitam: boolean;
  mixed: boolean;
};

export function CategoryGradeMatrixTable({
  lang,
  rows,
  grades,
  grandTotalRow,
  categoryColumnLabel,
  totalColumnLabel,
  emptyLabel,
  columnLabels,
  hideGradeHeader = false,
  collapseEmptyPitamColumns = true,
  tableRef,
}: CategoryGradeMatrixTableProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const visibilityRows = useMemo(
    () =>
      grandTotalRow
        ? [...rows, { key: '__grand', label: '', cells: grandTotalRow.cells }]
        : rows,
    [rows, grandTotalRow],
  );

  const hasAnyValue = useMemo(
    () =>
      visibilityRows.some((r) =>
        grades.some((grade) => {
          const cell = r.cells[grade];
          return cell
            ? cell.withPitam > 0 || cell.withoutPitam > 0 || cell.mixed > 0
            : false;
        }),
      ),
    [visibilityRows, grades],
  );

  const gradeColumns = useMemo(() => {
    const result: Record<string, GradeColumns> = {};
    for (const grade of grades) {
      const hasMixed =
        hasAnyValue &&
        visibilityRows.some((r) => (r.cells[grade]?.mixed ?? 0) > 0);

      if (!collapseEmptyPitamColumns || !hasAnyValue) {
        result[grade] = { withPitam: true, withoutPitam: true, mixed: hasMixed };
        continue;
      }
      const hasWithPitam = visibilityRows.some(
        (r) => (r.cells[grade]?.withPitam ?? 0) > 0,
      );
      const hasWithoutPitam = visibilityRows.some(
        (r) => (r.cells[grade]?.withoutPitam ?? 0) > 0,
      );
      result[grade] = {
        withPitam: hasWithPitam,
        withoutPitam: hasWithoutPitam,
        mixed: hasMixed,
      };
    }
    return result;
  }, [visibilityRows, grades, hasAnyValue, collapseEmptyPitamColumns]);

  if (rows.length === 0 || grades.length === 0) {
    return <p className={styles.emptyMessage}>{emptyLabel}</p>;
  }

  const cellOf = (
    cells: Record<string, PitamGradeCell>,
    grade: string,
  ): PitamGradeCell => cells[grade] ?? EMPTY_CELL;

  const colSpanOf = (grade: string) => {
    const cols = gradeColumns[grade];
    return Math.max(
      1,
      Number(cols.withPitam) + Number(cols.withoutPitam) + Number(cols.mixed),
    );
  };

  const isFirstVisibleColumn = (grade: string, key: keyof GradeColumns) => {
    const cols = gradeColumns[grade];
    const order: (keyof GradeColumns)[] = [
      'withPitam',
      'withoutPitam',
      'mixed',
    ];
    const firstVisible = order.find((k) => cols[k]);
    return firstVisible === key;
  };

  const dividerClass = (grade: string, key: keyof GradeColumns) =>
    isFirstVisibleColumn(grade, key) ? styles.gradeDivider : undefined;

  const rowTotal = (cells: Record<string, PitamGradeCell>) =>
    grades.reduce((sum, grade) => {
      const cell = cellOf(cells, grade);
      return sum + cell.withPitam + cell.withoutPitam + cell.mixed;
    }, 0);

  const renderDataCells = (cells: Record<string, PitamGradeCell>) =>
    grades.map((grade) => {
      const cell = cellOf(cells, grade);
      const cols = gradeColumns[grade];
      if (!cols.withPitam && !cols.withoutPitam && !cols.mixed) {
        return (
          <td key={grade} className={styles.gradeDivider}>
            {formatter.format(0)}
          </td>
        );
      }
      return (
        <Fragment key={grade}>
          {gradeColumns[grade].withPitam ? (
            <td className={dividerClass(grade, 'withPitam')}>
              {formatter.format(cell.withPitam)}
            </td>
          ) : null}
          {gradeColumns[grade].withoutPitam ? (
            <td className={dividerClass(grade, 'withoutPitam')}>
              {formatter.format(cell.withoutPitam)}
            </td>
          ) : null}
          {gradeColumns[grade].mixed ? (
            <td className={dividerClass(grade, 'mixed')}>
              {formatter.format(cell.mixed)}
            </td>
          ) : null}
        </Fragment>
      );
    });

  return (
    <div className={styles.tableViewport}>
      <table className={styles.table} ref={tableRef}>
        <thead>
          {hideGradeHeader ? null : (
            <tr>
              <th className={styles.categoryHead} rowSpan={2}>
                {categoryColumnLabel}
              </th>
              {grades.map((grade) => (
                <th
                  key={grade}
                  colSpan={colSpanOf(grade)}
                  className={styles.gradeDivider}
                >
                  {grade}
                </th>
              ))}
              <th className={styles.totalHead} rowSpan={2}>
                {totalColumnLabel}
              </th>
            </tr>
          )}
          <tr>
            {hideGradeHeader ? (
              <th className={styles.categoryHead}>{categoryColumnLabel}</th>
            ) : null}
            {grades.map((grade) => {
              const cols = gradeColumns[grade];
              if (!cols.withPitam && !cols.withoutPitam && !cols.mixed) {
                return (
                  <th key={grade} className={styles.gradeDivider}></th>
                );
              }
              return (
                <Fragment key={grade}>
                  {cols.withPitam ? (
                    <th className={dividerClass(grade, 'withPitam')}>
                      {columnLabels.withPitam}
                    </th>
                  ) : null}
                  {cols.withoutPitam ? (
                    <th className={dividerClass(grade, 'withoutPitam')}>
                      {columnLabels.withoutPitam}
                    </th>
                  ) : null}
                  {cols.mixed ? (
                    <th className={dividerClass(grade, 'mixed')}>
                      {columnLabels.mixed}
                    </th>
                  ) : null}
                </Fragment>
              );
            })}
            {hideGradeHeader ? (
              <th className={styles.totalHead}>{totalColumnLabel}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowClass = [
              row.variant === 'separator' ? styles.separatorRow : '',
              row.variant === 'subtotal' ? styles.subtotalRow : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <tr key={row.key} className={rowClass || undefined}>
                <th className={styles.categoryCell}>{row.label}</th>
                {renderDataCells(row.cells)}
                <td className={styles.totalCell}>
                  {formatter.format(rowTotal(row.cells))}
                </td>
              </tr>
            );
          })}
        </tbody>
        {grandTotalRow ? (
          <tfoot>
            <tr>
              <th className={styles.categoryCell}>{grandTotalRow.label}</th>
              {renderDataCells(grandTotalRow.cells)}
              <td className={styles.totalCell}>
                {formatter.format(rowTotal(grandTotalRow.cells))}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
