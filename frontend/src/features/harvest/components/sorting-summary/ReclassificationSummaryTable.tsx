import { useEffect, useMemo, useState } from 'react';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import { fetchReclassificationSummary, type ReclassificationSummaryEntry, type ReclassificationTuple } from '../../../../services/inventoryMovementsApi';
import styles from './HarvestSortingSummarySection.module.css';

const PITAM_STATUS_LABELS: Record<'he' | 'en', Record<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED', string>> = {
  he: { WITH_PITAM: 'עם פיטם', WITHOUT_PITAM: 'בלי פיטם', MIXED: 'מעורב' },
  en: { WITH_PITAM: 'With Pitam', WITHOUT_PITAM: 'Without Pitam', MIXED: 'Mixed' },
};

const TEXT: Record<'he' | 'en', { title: string; from: string; to: string; quantity: string }> = {
  he: {
    title: 'שינויי סיווג לאחר קטיף/מיון (לא כלול בנתוני הקטיף)',
    from: 'מ-',
    to: 'ל-',
    quantity: 'כמות',
  },
  en: {
    title: 'Reclassifications After Harvest/Sorting (Not Included in Harvest Data)',
    from: 'From',
    to: 'To',
    quantity: 'Quantity',
  },
};

type ReclassificationSummaryTableProps = {
  lang: 'he' | 'en';
  seasonId: number | null;
  traderCategories?: TraderCategoryWithShares[];
};

export function ReclassificationSummaryTable({
  lang,
  seasonId,
  traderCategories = [],
}: ReclassificationSummaryTableProps) {
  const [entries, setEntries] = useState<ReclassificationSummaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!seasonId) {
      setEntries([]);
      return;
    }

    let isActive = true;
    setIsLoading(true);

    fetchReclassificationSummary(seasonId)
      .then((result) => {
        if (!isActive) return;
        setEntries(result);
      })
      .catch(() => {
        if (!isActive) return;
        setEntries([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [seasonId]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of traderCategories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [traderCategories]);

  const text = TEXT[lang];
  const pitamLabels = PITAM_STATUS_LABELS[lang];

  const tupleLabel = (tuple: ReclassificationTuple) => {
    const categoryName = categoryNameById.get(tuple.traderCategoryId) ?? `#${tuple.traderCategoryId}`;
    const pitamLabel = pitamLabels[tuple.pitamStatus as keyof typeof pitamLabels] ?? tuple.pitamStatus;
    return `${categoryName} / ${tuple.grade} / ${pitamLabel}`;
  };

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  if (!seasonId || isLoading || entries.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <section className={styles.matrixSection}>
        <h3 className={styles.matrixTitle}>{text.title}</h3>
        <div className={styles.matrixViewport}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th className={styles.rowLabelHead}>{text.from}</th>
                <th className={styles.rowLabelHead}>{text.to}</th>
                <th className={styles.totalHead}>{text.quantity}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.from.traderCategoryId}-${entry.from.grade}-${entry.from.pitamStatus}-${entry.to.traderCategoryId}-${entry.to.grade}-${entry.to.pitamStatus}-${index}`}>
                  <th className={styles.rowLabelCell}>{tupleLabel(entry.from)}</th>
                  <td className={styles.gradeCell}>{tupleLabel(entry.to)}</td>
                  <td className={styles.totalCell}>{numberFormatter.format(entry.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
