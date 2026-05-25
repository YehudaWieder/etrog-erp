import React from 'react';

type ManagementSelectableCardProps = {
  isSelected: boolean;
  badgeLabel: string;
  onToggle: () => void;
  topContent: React.ReactNode;
  bottomContent?: React.ReactNode;
  selector?: React.ReactNode;
  topAside?: React.ReactNode;
  className?: string;
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
}) => {
  return (
    <button
      type="button"
      className={`seasons-manager__card${isSelected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}
      onClick={onToggle}
    >
      <span className="seasons-manager__card-shell">
        <span className="seasons-manager__card-top">
          {selector ?? (
            <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
              {isSelected ? '✓' : badgeLabel}
            </span>
          )}

          <span className="seasons-manager__card-top-main">{topContent}</span>

          {topAside ? <span className="seasons-manager__card-top-aside">{topAside}</span> : null}
        </span>

        <span className="seasons-manager__card-bottom">{bottomContent ?? null}</span>
      </span>
    </button>
  );
};

export default ManagementSelectableCard;
