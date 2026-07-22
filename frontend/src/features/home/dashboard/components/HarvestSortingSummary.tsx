import { useMemo } from 'react';
import type { SortingSummaryData } from '../types';
import { CategoryGradeTable } from './CategoryGradeTable';
import { LabelNote } from './LabelNote';
import styles from '../styles/HarvestSortingSummary.module.css';

type HarvestSortingSummaryProps = {
  lang: 'he' | 'en';
  data: SortingSummaryData;
  unit: string;
  labels: {
    netHarvest: string;
    categoryColumn: string;
    totalColumn: string;
    privateSort: string;
    customerSort: string;
    empty: string;
    tableNote: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function HarvestSortingSummary({ lang, data, unit, labels }: HarvestSortingSummaryProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <div className={styles.section}>
      <div className={styles.netHarvestLine}>
        {labels.netHarvest}: <strong>{formatter.format(data.netHarvest)} {unit}</strong>
      </div>

      <CategoryGradeTable
        lang={lang}
        categories={data.categories}
        grades={data.grades}
        matrix={data.matrix}
        categoryColumnLabel={labels.categoryColumn}
        totalColumnLabel={labels.totalColumn}
        emptyLabel={labels.empty}
        columnLabels={labels.columns}
      />

      <p className={styles.tableNote}>{labels.tableNote}</p>

      <div className={styles.footerLines}>
        <div className={styles.footerLine}>
          <LabelNote label={labels.privateSort} />: <strong>{formatter.format(data.privateSortTotal)} {unit}</strong>
        </div>
        <div className={styles.footerLine}>
          <LabelNote label={labels.customerSort} />: <strong>{formatter.format(data.customerSortTotal)} {unit}</strong>
        </div>
      </div>
    </div>
  );
}
