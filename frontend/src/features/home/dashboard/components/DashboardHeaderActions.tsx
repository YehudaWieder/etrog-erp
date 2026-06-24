import { useState, useRef, useEffect } from 'react';
import { FaBolt, FaChevronDown } from 'react-icons/fa6';
import btnStyles from '../../../../components/ui/styles/HeaderActionButtons.module.css';
import styles from '../styles/DashboardHeaderActions.module.css';

type QuickAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

type DashboardHeaderActionsProps = {
  quickActionsLabel: string;
  actions?: QuickAction[];
};

export function DashboardHeaderActions({
  quickActionsLabel,
  actions = [],
}: DashboardHeaderActionsProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${btnStyles.button} ${btnStyles.success} ${styles.trigger}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FaBolt />
        <span>{quickActionsLabel}</span>
        <FaChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {actions.length === 0 ? (
            <span className={styles.empty}>—</span>
          ) : (
            actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={styles.item}
                role="menuitem"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
              >
                {action.icon && <span className={styles.itemIcon}>{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
