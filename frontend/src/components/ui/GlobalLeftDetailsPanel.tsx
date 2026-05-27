import type { ReactNode } from 'react';
import { FaXmark } from 'react-icons/fa6';

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
      className={`global-left-details-panel${isOpen ? ' is-open' : ''}`}
      aria-hidden={!isOpen}
      aria-label={title}
    >
      <div className="global-left-details-panel__header">
        <h3 className="global-left-details-panel__title">{title}</h3>
        <div className="global-left-details-panel__header-actions">
          {headerActions}
          <button
            type="button"
            className="global-left-details-panel__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <FaXmark />
          </button>
        </div>
      </div>
      <div className="global-left-details-panel__body">{children}</div>
    </aside>
  );
}
