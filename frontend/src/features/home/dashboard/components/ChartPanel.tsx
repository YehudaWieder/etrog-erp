import { useState, useEffect, type ReactNode } from 'react';
import { FaExpand, FaXmark } from 'react-icons/fa6';
import styles from '../styles/ChartPanel.module.css';

export type ChartTab = {
  label: string;
  content: ReactNode;
};

type ChartPanelProps = {
  title: string;
  tabs: ChartTab[];
  expandLabel?: string;
  closeLabel?: string;
};

export function ChartPanel({ title, tabs, expandLabel = 'Expand', closeLabel = 'Close' }: ChartPanelProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  const tabsBar = (
    <div className={styles.tabsBar}>
      {tabs.map((tab, i) => (
        <button
          key={i}
          className={`${styles.tabBtn} ${i === activeIndex ? styles.activeTab : ''}`}
          onClick={() => setActiveIndex(i)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.header}>{title}</div>
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setExpanded(true)}
            aria-label={expandLabel}
            title={expandLabel}
          >
            <FaExpand />
          </button>
        </div>

        <div className={styles.chartArea}>
          {tabs.map((tab, i) => (
            <div
              key={i}
              className={`${styles.tabContent} ${i === activeIndex ? styles.active : ''}`}
              aria-hidden={i !== activeIndex}
            >
              {tab.content}
            </div>
          ))}
        </div>

        {tabsBar}
      </div>

      {expanded && (
        <div className={styles.overlay} onClick={() => setExpanded(false)} role="dialog" aria-modal>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.header}>{title}</div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setExpanded(false)}
                aria-label={closeLabel}
              >
                <FaXmark />
              </button>
            </div>
            <div className={styles.modalChartArea}>
              {tabs.map((tab, i) => (
                <div
                  key={i}
                  className={`${styles.tabContent} ${i === activeIndex ? styles.active : ''}`}
                  aria-hidden={i !== activeIndex}
                >
                  {tab.content}
                </div>
              ))}
            </div>
            {tabsBar}
          </div>
        </div>
      )}
    </>
  );
}
