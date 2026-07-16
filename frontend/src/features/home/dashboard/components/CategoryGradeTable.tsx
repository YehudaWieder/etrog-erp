import { useMemo } from 'react';
import styles from '../styles/CategoryGradeTable.module.css';

type CategoryGradeTableProps = {
  lang: 'he' | 'en';
  categories: string[];
  grades: string[];
  matrix: Record<string, Record<string, number>>;
  categoryColumnLabel: string;
  totalColumnLabel: string;
  emptyLabel: string;
};

export function CategoryGradeTable({
  lang,
  categories,
  grades,
  matrix,
  categoryColumnLabel,
  totalColumnLabel,
  emptyLabel,
}: CategoryGradeTableProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  if (categories.length === 0 || grades.length === 0) {
    return <p className={styles.emptyMessage}>{emptyLabel}</p>;
  }

  const rowTotal = (cat: string) => grades.reduce((sum, grade) => sum + (matrix[cat]?.[grade] ?? 0), 0);

  return (
    <div className={styles.tableViewport}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.categoryHead}>{categoryColumnLabel}</th>
            {grades.map((grade) => (
              <th key={grade}>{grade}</th>
            ))}
            <th className={styles.totalHead}>{totalColumnLabel}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat}>
              <th className={styles.categoryCell}>{cat}</th>
              {grades.map((grade) => (
                <td key={grade}>{formatter.format(matrix[cat]?.[grade] ?? 0)}</td>
              ))}
              <td className={styles.totalCell}>{formatter.format(rowTotal(cat))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
