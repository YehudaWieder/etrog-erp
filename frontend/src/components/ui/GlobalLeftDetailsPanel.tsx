import type { ReactNode } from 'react';
import { FaXmark } from 'react-icons/fa6';
import styles from './styles/GlobalLeftDetailsPanel.module.css';

type GlobalLeftDetailsPanelProps = {
  isOpen: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function GlobalLeftDetailsPanel({
  isOpen,
  title,
  closeLabel,
  onClose,
  headerActions,
  children,
}: GlobalLeftDetailsPanelProps): JSX.Element {
  return (
    <aside
      className={`global-left-details-panel ${styles.root}${isOpen ? ` ${styles.open}` : ''}`}
      aria-hidden={!isOpen}
      aria-label={title}
    >
      <div className={`global-left-details-panel__header ${styles.header}`}>
        <h3 className={`global-left-details-panel__title ${styles.title}`}>{title}</h3>
        <div className={`global-left-details-panel__header-actions ${styles.headerActions}`}>
          {headerActions}
          <button
            type="button"
            className={`global-left-details-panel__close ${styles.close}`}
            onClick={onClose}
            aria-label={closeLabel}
          >
            <FaXmark />
          </button>
        </div>
      </div>
      <div className={`global-left-details-panel__body ${styles.body}`}>{children}</div>
    </aside>
  );
}
