import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { FaBoxesStacked, FaBoxOpen, FaTruckFast, FaTruck, FaScaleBalanced, FaUserTie, FaUsers, FaCubes, FaStar, FaChartSimple } from 'react-icons/fa6';
import styles from '../styles/ShipmentsSummaryCards.module.css';

const CARD_ICONS: Record<string, ReactNode> = {
  'total-boxes': <FaBoxesStacked aria-hidden="true" />,
  'not-shipped': <FaBoxOpen aria-hidden="true" />,
  shipped: <FaTruckFast aria-hidden="true" />,
  'total-shipments': <FaTruck aria-hidden="true" />,
  'total-quantity': <FaScaleBalanced aria-hidden="true" />,
  'trader-general': <FaUserTie aria-hidden="true" />,
  customer: <FaUsers aria-hidden="true" />,
  general: <FaCubes aria-hidden="true" />,
  private: <FaStar aria-hidden="true" />,
};

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
          <div className={styles.iconBadge}>{CARD_ICONS[card.key] ?? <FaChartSimple aria-hidden="true" />}</div>
          <span className={styles.summaryLabel}>{card.label}</span>
          <strong className={styles.summaryValue}>{formatter.format(card.value)}</strong>
        </article>
      ))}
    </div>
  );
}