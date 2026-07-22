import { Fragment, useMemo } from 'react';
import type { PitamGradeCell } from '../types';
import styles from '../styles/CategoryGradeTable.module.css';
import dividerStyles from '../styles/PitamCategoryGradeTable.module.css';

type CategoryGradeTableProps = {
  lang: 'he' | 'en';
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, PitamGradeCell>>;
  categoryColumnLabel: string;
  totalColumnLabel: string;
  emptyLabel: string;
  columnLabels: {
    withPitam: string;
    withoutPitam: string;
    mixed: string;
  };
};

const emptyCell: PitamGradeCell = { withPitam: 0, withoutPitam: 0, mixed: 0 };

export function CategoryGradeTable({
  lang,
  categories,
  grades,
  matrix,
  categoryColumnLabel,
  totalColumnLabel,
  emptyLabel,
  columnLabels,
}: CategoryGradeTableProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  type GradeColumns = { withPitam: boolean; withoutPitam: boolean; mixed: boolean };

  const gradeColumns = useMemo(() => {
    const result: Record<string, GradeColumns> = {};
    for (const grade of grades) {
      const hasWithPitam = categories.some((cat) => (matrix[cat]?.[grade]?.withPitam ?? 0) > 0);
      const hasWithoutPitam = categories.some((cat) => (matrix[cat]?.[grade]?.withoutPitam ?? 0) > 0);
      const hasMixed = categories.some((cat) => (matrix[cat]?.[grade]?.mixed ?? 0) > 0);
      // "ללא" grade only ever shows the sub-columns that actually carry data.
      result[grade] =
        grade === 'ללא'
          ? { withPitam: hasWithPitam, withoutPitam: hasWithoutPitam, mixed: hasMixed }
          : { withPitam: true, withoutPitam: true, mixed: hasMixed };
    }
    return result;
  }, [categories, grades, matrix]);

  if (categories.length === 0 || grades.length === 0) {
    return <p className={styles.emptyMessage}>{emptyLabel}</p>;
  }

  const cellOf = (cat: string, grade: string): PitamGradeCell => matrix[cat]?.[grade] ?? emptyCell;

  const colSpanOf = (grade: string) => {
    const cols = gradeColumns[grade];
    return Number(cols.withPitam) + Number(cols.withoutPitam) + Number(cols.mixed);
  };

  const isFirstVisibleColumn = (grade: string, key: keyof GradeColumns) => {
    const cols = gradeColumns[grade];
    const order: (keyof GradeColumns)[] = ['withPitam', 'withoutPitam', 'mixed'];
    const firstVisible = order.find((k) => cols[k]);
    return firstVisible === key;
  };

  const dividerClass = (grade: string, key: keyof GradeColumns) =>
    isFirstVisibleColumn(grade, key) ? dividerStyles.gradeDivider : undefined;

  const rowTotal = (cat: string) =>
    grades.reduce((sum, grade) => {
      const cell = cellOf(cat, grade);
      return sum + cell.withPitam + cell.withoutPitam + cell.mixed;
    }, 0);

  return (
    <div className={styles.tableViewport}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.categoryHead} rowSpan={2}>{categoryColumnLabel}</th>
            {grades.map((grade) => (
              <th key={grade} colSpan={colSpanOf(grade)} className={dividerStyles.gradeDivider}>{grade}</th>
            ))}
            <th className={styles.totalHead} rowSpan={2}>{totalColumnLabel}</th>
          </tr>
          <tr>
            {grades.map((grade) => (
              <Fragment key={grade}>
                {gradeColumns[grade].withPitam ? <th className={dividerClass(grade, 'withPitam')}>{columnLabels.withPitam}</th> : null}
                {gradeColumns[grade].withoutPitam ? <th className={dividerClass(grade, 'withoutPitam')}>{columnLabels.withoutPitam}</th> : null}
                {gradeColumns[grade].mixed ? <th className={dividerClass(grade, 'mixed')}>{columnLabels.mixed}</th> : null}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat}>
              <th className={styles.categoryCell}>{cat}</th>
              {grades.map((grade) => {
                const cell = cellOf(cat, grade);
                return (
                  <Fragment key={grade}>
                    {gradeColumns[grade].withPitam ? <td className={dividerClass(grade, 'withPitam')}>{formatter.format(cell.withPitam)}</td> : null}
                    {gradeColumns[grade].withoutPitam ? <td className={dividerClass(grade, 'withoutPitam')}>{formatter.format(cell.withoutPitam)}</td> : null}
                    {gradeColumns[grade].mixed ? <td className={dividerClass(grade, 'mixed')}>{formatter.format(cell.mixed)}</td> : null}
                  </Fragment>
                );
              })}
              <td className={styles.totalCell}>{formatter.format(rowTotal(cat))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
