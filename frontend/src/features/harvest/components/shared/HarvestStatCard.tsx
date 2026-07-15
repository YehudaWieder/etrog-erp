import type { ReactNode } from 'react';
import styles from '../styles/HarvestStatCard.module.css';

export type HarvestStatCardItem = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
};

type HarvestStatCardGridProps = {
  items: HarvestStatCardItem[];
};

export function HarvestStatCardGrid({ items }: HarvestStatCardGridProps): JSX.Element {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <article key={item.key} className={styles.card}>
          <div className={styles.iconBadge}>{item.icon}</div>
          <span className={styles.label}>{item.label}</span>
          <strong className={styles.value}>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
