import { useMemo } from 'react';
import styles from '../styles/ShipmentsSummaryCards.module.css';

export type ShipmentsSummaryCardsProps = {
  lang: 'he' | 'en';
  cards: Array<{
    key: string;
    label: string;
    value: number;
  }>;
};

export function ShipmentsSummaryCards({ lang, cards }: ShipmentsSummaryCardsProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <div className={styles.summaryGrid}>
      {cards.map((card) => (
        <article key={card.key} className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{card.label}</span>
          <strong className={styles.summaryValue}>{formatter.format(card.value)}</strong>
        </article>
      ))}
    </div>
  );
}