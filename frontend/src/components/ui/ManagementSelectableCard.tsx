import React from 'react';
import styles from './styles/ManagementSelectableCard.module.css';

type ManagementSelectableCardProps = {
  isSelected: boolean;
  badgeLabel: string;
  onToggle: () => void;
  topContent: React.ReactNode;
  bottomContent?: React.ReactNode;
  selector?: React.ReactNode;
  topAside?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
};

const ManagementSelectableCard: React.FC<ManagementSelectableCardProps> = ({
  isSelected,
  badgeLabel,
  onToggle,
  topContent,
  bottomContent,
  selector,
  topAside,
  className,
  disabled,
  title,
}) => {
  return (
    <button
      type="button"
      className={`seasons-manager__card ${styles.card}${isSelected ? ` is-selected ${styles.cardSelected}` : ''}${className ? ` ${className}` : ''}`}
      onClick={onToggle}
      disabled={disabled}
      title={title}
    >
      <span className={`seasons-manager__card-shell ${styles.cardShell}`}>
        <span className={`seasons-manager__card-top ${styles.cardTop}`}>
          {selector ?? (
            <span className={`seasons-manager__selector ${styles.selector}${isSelected ? ` is-selected ${styles.selectorSelected}` : ''}`}>
              {isSelected ? '✓' : badgeLabel}
            </span>
          )}

          <span className={`seasons-manager__card-top-main ${styles.cardTopMain}`}>{topContent}</span>

          {topAside ? <span className={`seasons-manager__card-top-aside ${styles.cardTopAside}`}>{topAside}</span> : null}
        </span>

        <span className={`seasons-manager__card-bottom ${styles.cardBottom}`}>{bottomContent ?? null}</span>
      </span>
    </button>
  );
};

export default ManagementSelectableCard;
