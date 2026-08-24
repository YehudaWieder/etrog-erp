import { useMemo } from 'react';
import type { IsraelSortingSummaryData } from '../israelTypes';
import { CategoryGradeTable } from '../../../home/dashboard/components/CategoryGradeTable';
import styles from '../../../home/dashboard/styles/HarvestSortingSummary.module.css';
import inventoryStyles from '../../../home/dashboard/styles/InventorySummary.module.css';

export const ISRAEL_SORTING_GENERAL_KEY = '__general__';

type IsraelHarvestSortingSummaryProps = {
  lang: 'he' | 'en';
  data: IsraelSortingSummaryData;
  unit: string;
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
  labels: {
    netHarvest: string;
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

export function IsraelHarvestSortingSummary({ lang, data, unit, activeKey, onActiveKeyChange, labels }: IsraelHarvestSortingSummaryProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const isGeneral = activeKey === ISRAEL_SORTING_GENERAL_KEY;
  const activeData = isGeneral ? data.general : data.byField[activeKey];

  return (
    <div className={styles.section}>
      <div className={styles.netHarvestLine}>
        {labels.netHarvest}: <strong>{formatter.format(data.netHarvest)} {unit}</strong>
      </div>

      <div className={inventoryStyles.tabsBar}>
        <button
          type="button"
          className={`${inventoryStyles.tabBtn} ${isGeneral ? inventoryStyles.activeTab : ''}`}
          onClick={() => onActiveKeyChange(ISRAEL_SORTING_GENERAL_KEY)}
        >
          {labels.generalTab}
        </button>
        {data.fieldNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`${inventoryStyles.tabBtn} ${name === activeKey ? inventoryStyles.activeTab : ''}`}
            onClick={() => onActiveKeyChange(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {activeData && (
        <>
          <div className={inventoryStyles.totalLine}>
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
