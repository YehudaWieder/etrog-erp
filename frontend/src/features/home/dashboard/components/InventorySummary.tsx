import { useMemo, useState } from 'react';
import type { InventorySummaryData } from '../types';
import { CategoryGradeTable } from './CategoryGradeTable';
import { LabelNote } from './LabelNote';
import styles from '../styles/InventorySummary.module.css';

const GENERAL_KEY = '__general__';

type InventorySummaryProps = {
  lang: 'he' | 'en';
  data: InventorySummaryData;
  unit: string;
  labels: {
    generalTab: string;
    totalLabel: string;
    categoryColumn: string;
    totalColumn: string;
    empty: string;
    customerNote: string;
    privateNote: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function InventorySummary({ lang, data, unit, labels }: InventorySummaryProps): JSX.Element {
  const [activeKey, setActiveKey] = useState<string>(GENERAL_KEY);
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const isGeneral = activeKey === GENERAL_KEY;
  const activeData = isGeneral ? data.general : data.byTrader[activeKey];

  return (
    <div className={styles.section}>
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${isGeneral ? styles.activeTab : ''}`}
          onClick={() => setActiveKey(GENERAL_KEY)}
        >
          {labels.generalTab}
        </button>
        {data.traderNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.tabBtn} ${name === activeKey ? styles.activeTab : ''}`}
            onClick={() => setActiveKey(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {activeData && (
        <>
          <div className={styles.totalLine}>
            {labels.totalLabel}: <strong>{formatter.format(activeData.total)} {unit}</strong>
          </div>

          <CategoryGradeTable
            lang={lang}
            categories={activeData.categories}
            grades={activeData.grades}
            matrix={activeData.matrix}
            categoryColumnLabel={labels.categoryColumn}
            totalColumnLabel={labels.totalColumn}
            emptyLabel={labels.empty}
            columnLabels={labels.columns}
          />

          {isGeneral ? (
            <div className={styles.footerLine}>
              <LabelNote label={labels.customerNote} />: <strong>{formatter.format(data.general.customerTotal)} {unit}</strong>
            </div>
          ) : (
            <div className={styles.footerLine}>
              <LabelNote label={labels.privateNote} />: <strong>{formatter.format(data.byTrader[activeKey].privateTotal)} {unit}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
