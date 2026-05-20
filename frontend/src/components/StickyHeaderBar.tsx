import React from 'react';

interface StickyHeaderBarProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

export const StickyHeaderBar: React.FC<StickyHeaderBarProps> = ({ title, actions, subtitle, className }) => (
  <div className={`sticky-header-bar${className ? ' ' + className : ''}`}>
    <div className="sticky-header-bar__main">
      <div className="sticky-header-bar__label">
        <span className="sticky-header-bar__title">{title}</span>
        {subtitle ? <span className="sticky-header-bar__subtitle">{subtitle}</span> : null}
      </div>
    </div>
    {actions && <div className="sticky-header-bar__actions">{actions}</div>}
  </div>
);
