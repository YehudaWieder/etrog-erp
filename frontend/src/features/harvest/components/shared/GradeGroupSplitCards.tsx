import type { CategoryGradeGroupSplit } from '../../utils/gradeGroupBreakdown.util';
import styles from './GradeGroupSplitCards.module.css';

type GradeGroupSplitCardsProps = {
  title: string;
  splits: CategoryGradeGroupSplit[];
  groupColumnLabel: string;
  percentColumnLabel: string;
  locale: string;
  compact?: boolean;
};

export function GradeGroupSplitCards({
  title,
  splits,
  groupColumnLabel,
  percentColumnLabel,
  locale,
  compact = false,
}: GradeGroupSplitCardsProps): JSX.Element | null {
  if (splits.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.section} harvest-daily-workspace__group-split-section`}>
      <h3 className={`${styles.title}${compact ? ` ${styles.titleCompact}` : ''} harvest-daily-workspace__group-split-title`}>{title}</h3>
      <div className={`${styles.list}${compact ? ` ${styles.listStart}` : ''} harvest-daily-workspace__group-split-list`}>
        {splits.map((split) => (
          <div key={split.category} className={`${styles.card} harvest-daily-workspace__group-split-card`}>
            <h4 className={`${styles.cardTitle} harvest-daily-workspace__group-split-card-title`}>{split.category}</h4>
            <table className={`${styles.table} harvest-daily-workspace__group-split-table`}>
              <thead>
                <tr>
                  <th>{groupColumnLabel}</th>
                  <th>{percentColumnLabel}</th>
                </tr>
              </thead>
              <tbody>
                {split.rows.map((row) => (
                  <tr key={row.groupName}>
                    <td>{row.groupName}</td>
                    <td>{`${row.percent.toLocaleString(locale, { maximumFractionDigits: 1 })}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
