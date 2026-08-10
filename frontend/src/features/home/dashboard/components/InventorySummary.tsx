import { useMemo } from 'react';
import type { InventorySummaryData } from '../types';
import { CategoryGradeTable } from './CategoryGradeTable';
import { LabelNote } from './LabelNote';
import styles from '../styles/InventorySummary.module.css';

export const GENERAL_KEY = '__general__';
export const MODULO_KEY = '__modulo__';

type InventorySummaryProps = {
  lang: 'he' | 'en';
  data: InventorySummaryData;
  unit: string;
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
  labels: {
    generalTab: string;
    moduloTab: string;
    totalLabel: string;
    categoryColumn: string;
    totalColumn: string;
    empty: string;
    customerNote: string;
    privateNote: string;
    moduloNote: string;
    remainsInItalyNote: string;
    remainsInItalyFooterNote: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function InventorySummary({ lang, data, unit, activeKey, onActiveKeyChange, labels }: InventorySummaryProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const isGeneral = activeKey === GENERAL_KEY;
  const isModulo = activeKey === MODULO_KEY;
  const activeData = isGeneral ? data.general : isModulo ? data.modulo : data.byTrader[activeKey];

  return (
    <div className={styles.section}>
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${isGeneral ? styles.activeTab : ''}`}
          onClick={() => onActiveKeyChange(GENERAL_KEY)}
        >
          {labels.generalTab}
        </button>
        {data.traderNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.tabBtn} ${name === activeKey ? styles.activeTab : ''}`}
            onClick={() => onActiveKeyChange(name)}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.tabBtn} ${isModulo ? styles.activeTab : ''}`}
          onClick={() => onActiveKeyChange(MODULO_KEY)}
        >
          {labels.moduloTab}
        </button>
      </div>

      {activeData && (
        <>
          <div className={styles.totalLine}>
            {labels.totalLabel}: <strong>{formatter.format(activeData.total)} {unit}</strong>
            {isGeneral && data.general.remainsInItalyTotal > 0 && (
              <span className={styles.remainsInItalyNote}>
                {' '}
                ({labels.remainsInItalyNote.replace('{value}', `${formatter.format(data.general.remainsInItalyTotal)} ${unit}`)})
              </span>
            )}
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

          {isGeneral && (
            <>
              <div className={styles.footerLine}>
                <LabelNote label={labels.customerNote} />: <strong>{formatter.format(data.general.customerTotal)} {unit}</strong>
              </div>
              <div className={styles.footerLine}>
                <LabelNote label={labels.remainsInItalyFooterNote} />: <strong>{formatter.format(data.general.remainsInItalyTotal)} {unit}</strong>
              </div>
              <div className={styles.footerLine}>
                <LabelNote label={labels.privateNote} />: <strong>{formatter.format(data.general.privateTotal)} {unit}</strong>
              </div>
              <div className={styles.footerLine}>
                <LabelNote label={labels.moduloNote} />: <strong>{formatter.format(data.modulo.total)} {unit}</strong>
              </div>
            </>
          )}
          {!isGeneral && !isModulo && (
            <div className={styles.footerLine}>
              <LabelNote label={labels.privateNote} />: <strong>{formatter.format(data.byTrader[activeKey].privateTotal)} {unit}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
