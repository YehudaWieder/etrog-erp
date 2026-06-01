import React from 'react';
import styles from './StickyHeaderBar.module.css';

interface StickyHeaderBarProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

export const StickyHeaderBar: React.FC<StickyHeaderBarProps> = ({ title, actions, subtitle, className }) => (
  <div className={`${styles.root} sticky-header-bar${className ? ' ' + className : ''}`}>
    <div className={`${styles.main} sticky-header-bar__main`}>
      <div className={`${styles.label} sticky-header-bar__label`}>
        <span className={`${styles.title} sticky-header-bar__title`}>{title}</span>
        {subtitle ? <span className={`${styles.subtitle} sticky-header-bar__subtitle`}>{subtitle}</span> : null}
      </div>
    </div>
    {actions && <div className={`${styles.actions} sticky-header-bar__actions`}>{actions}</div>}
  </div>
);
