import { useState, type ReactNode } from 'react';
import { FaPrint } from 'react-icons/fa6';
import styles from '../styles/SummarySection.module.css';

export type SummaryTab = {
  key: string;
  label: string;
  content: ReactNode;
};

type SummarySectionProps = {
  title: string;
  tabs: SummaryTab[];
  onPrint?: () => void;
  printTitle?: string;
};

export function SummarySection({ title, tabs, onPrint, printTitle }: SummarySectionProps): JSX.Element {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <div className={styles.title}>{title}</div>
        {onPrint && (
          <button
            type="button"
            className={styles.printBtn}
            onClick={onPrint}
            aria-label={printTitle}
            title={printTitle}
          >
            <FaPrint />
          </button>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.tabsBar}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.tabBtn} ${tab.key === activeKey ? styles.activeTab : ''}`}
              onClick={() => setActiveKey(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`${styles.tabContent} ${tab.key === activeKey ? styles.active : ''}`}
              aria-hidden={tab.key !== activeKey}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
