import { useMemo } from 'react';
import type { IsraelShipmentsSummaryData } from '../israelTypes';
import { CategoryGradeTable } from '../../../home/dashboard/components/CategoryGradeTable';
import { LabelNote } from '../../../home/dashboard/components/LabelNote';
import styles from '../../../home/dashboard/styles/ShipmentsSummary.module.css';
import inventoryStyles from '../../../home/dashboard/styles/InventorySummary.module.css';

export type IsraelShipmentStatusKey = 'packaged' | 'shipped' | 'delivered';

export const ISRAEL_SHIPMENTS_GENERAL_KEY = '__general__';

const STATUS_KEYS: IsraelShipmentStatusKey[] = ['packaged', 'shipped', 'delivered'];

type IsraelShipmentsSummaryProps = {
  lang: 'he' | 'en';
  data: IsraelShipmentsSummaryData;
  unit: string;
  activeStatus: IsraelShipmentStatusKey;
  onActiveStatusChange: (status: IsraelShipmentStatusKey) => void;
  activeFieldKey: string;
  onActiveFieldKeyChange: (key: string) => void;
  labels: {
    statusTabs: Record<IsraelShipmentStatusKey, string>;
    totalLabels: Record<IsraelShipmentStatusKey, string>;
    generalTab: string;
    categoryColumn: string;
    totalColumn: string;
    empty: string;
    selfPickupNote: string;
    columns: {
      withPitam: string;
      withoutPitam: string;
      mixed: string;
    };
  };
};

export function IsraelShipmentsSummary({
  lang,
  data,
  unit,
  activeStatus,
  onActiveStatusChange,
  activeFieldKey,
  onActiveFieldKeyChange,
  labels,
}: IsraelShipmentsSummaryProps): JSX.Element {
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const statusGroup = data[activeStatus];
  const isGeneral = activeFieldKey === ISRAEL_SHIPMENTS_GENERAL_KEY;
  const activeData = isGeneral ? statusGroup.general : statusGroup.byField[activeFieldKey];

  return (
    <div className={styles.section}>
      <div className={styles.statusTabsBar}>
        {STATUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.statusTabBtn} ${key === activeStatus ? styles.activeStatusTab : ''}`}
            onClick={() => onActiveStatusChange(key)}
          >
            {labels.statusTabs[key]}
          </button>
        ))}
      </div>

      <div className={styles.totalLine}>
        {labels.totalLabels[activeStatus]}: <strong>{formatter.format(statusGroup.general.total)} {unit}</strong>
      </div>

      <div className={inventoryStyles.tabsBar}>
        <button
          type="button"
          className={`${inventoryStyles.tabBtn} ${isGeneral ? inventoryStyles.activeTab : ''}`}
          onClick={() => onActiveFieldKeyChange(ISRAEL_SHIPMENTS_GENERAL_KEY)}
        >
          {labels.generalTab}
        </button>
        {statusGroup.fieldNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`${inventoryStyles.tabBtn} ${name === activeFieldKey ? inventoryStyles.activeTab : ''}`}
            onClick={() => onActiveFieldKeyChange(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {activeData && (
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
      )}

      <div className={styles.footerLines}>
        <div className={styles.footerLine}>
          <LabelNote label={labels.selfPickupNote} />: <strong>{formatter.format(data.selfPickupTotal)} {unit}</strong>
        </div>
      </div>
    </div>
  );
}
