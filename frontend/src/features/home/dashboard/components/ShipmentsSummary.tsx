import { useMemo, useState } from 'react';
import type { ShipmentsSummaryData } from '../types';
import { CategoryGradeTable } from './CategoryGradeTable';
import { LabelNote } from './LabelNote';
import styles from '../styles/ShipmentsSummary.module.css';

type StatusKey = 'packaged' | 'shipped' | 'delivered';

const STATUS_KEYS: StatusKey[] = ['packaged', 'shipped', 'delivered'];

type ShipmentsSummaryProps = {
  lang: 'he' | 'en';
  data: ShipmentsSummaryData;
  unit: string;
  labels: {
    statusTabs: Record<StatusKey, string>;
    totalLabels: Record<StatusKey, string>;
    categoryColumn: string;
    totalColumn: string;
    empty: string;
    tableNote: string;
    customerNote: string;
    selfPickupNote: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function ShipmentsSummary({ lang, data, unit, labels }: ShipmentsSummaryProps): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<StatusKey>('packaged');
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const statusData = data[activeStatus];

  return (
    <div className={styles.section}>
      <div className={styles.statusTabsBar}>
        {STATUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.statusTabBtn} ${key === activeStatus ? styles.activeStatusTab : ''}`}
            onClick={() => setActiveStatus(key)}
          >
            {labels.statusTabs[key]}
          </button>
        ))}
      </div>

      <div className={styles.totalLine}>
        {labels.totalLabels[activeStatus]}: <strong>{formatter.format(statusData.total)} {unit}</strong>
      </div>

      <CategoryGradeTable
        lang={lang}
        categories={statusData.categories}
        grades={statusData.grades}
        matrix={statusData.matrix}
        categoryColumnLabel={labels.categoryColumn}
        totalColumnLabel={labels.totalColumn}
        emptyLabel={labels.empty}
        columnLabels={labels.columns}
      />

      <p className={styles.tableNote}>{labels.tableNote}</p>

      <div className={styles.footerLines}>
        <div className={styles.footerLine}>
          <LabelNote label={labels.customerNote} />: <strong>{formatter.format(statusData.customerTotal)} {unit}</strong>
        </div>
        <div className={styles.footerLine}>
          <LabelNote label={labels.selfPickupNote} />: <strong>{formatter.format(data.selfPickupTotal)} {unit}</strong>
        </div>
      </div>
    </div>
  );
}
