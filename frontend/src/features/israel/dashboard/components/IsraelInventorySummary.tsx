import { useMemo } from 'react';
import type { IsraelInventorySummaryData } from '../israelTypes';
import { CategoryGradeTable } from '../../../home/dashboard/components/CategoryGradeTable';
import styles from '../../../home/dashboard/styles/InventorySummary.module.css';

export const ISRAEL_GENERAL_KEY = '__general__';

type IsraelInventorySummaryProps = {
  lang: 'he' | 'en';
  data: IsraelInventorySummaryData;
  unit: string;
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
  labels: {
    generalTab: string;
    totalLabel: string;
    categoryColumn: string;
    totalColumn: string;
    empty: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function IsraelInventorySummary({ lang, data, unit, activeKey, onActiveKeyChange, labels }: IsraelInventorySummaryProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const isGeneral = activeKey === ISRAEL_GENERAL_KEY;
  const activeData = isGeneral ? data.general : data.byField[activeKey];

  return (
    <div className={styles.section}>
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${isGeneral ? styles.activeTab : ''}`}
          onClick={() => onActiveKeyChange(ISRAEL_GENERAL_KEY)}
        >
          {labels.generalTab}
        </button>
        {data.fieldNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.tabBtn} ${name === activeKey ? styles.activeTab : ''}`}
            onClick={() => onActiveKeyChange(name)}
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
        </>
      )}
    </div>
  );
}
