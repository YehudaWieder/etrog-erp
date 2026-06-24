import { useId, type ReactNode } from 'react';
import styles from '../styles/GaugeCard.module.css';

// arc length for ~239.5° (360° minus the ~120.5° bottom gap between endpoints 15,70 and 85,70)
const GAUGE_ARC = (Math.PI + 2 * Math.atan2(20, 35)) * 40;

type GaugeCardProps = {
  title: string;
  valueLabel: string;
  percent: number;
  maxValue?: number;
  variant?: 'default' | 'danger';
  icon?: ReactNode;
};

export function GaugeCard({ title, valueLabel, percent, maxValue, variant = 'default', icon }: GaugeCardProps): JSX.Element {
  const uid = useId();
  const gradientId = `gaugeGrad${uid}`;
  const offset = (1 - Math.min(Math.max(percent, 0), 100) / 100) * GAUGE_ARC;

  const formatShort = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(Math.round(n));
  };

  return (
    <div className={styles.card}>
      <div className={styles.svgWrapper}>
        <svg className={styles.gaugeSvg} viewBox="0 0 100 80" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="50" y1="5" x2="50" y2="75">
              <stop offset="0%" stopColor="#ffe168" />
              <stop offset="100%" stopColor="#d4930a" />
            </linearGradient>
          </defs>
          <path className={styles.gaugeBg} d="M 15 70 A 40 40 0 1 1 85 70" />
          <path
            className={`${styles.gaugeFill} ${variant === 'danger' ? styles.danger : ''}`}
            d="M 15 70 A 40 40 0 1 1 85 70"
            strokeDasharray={GAUGE_ARC}
            strokeDashoffset={offset}
            style={variant !== 'danger' ? { stroke: `url(#${gradientId})` } : undefined}
          />
          <text
            className={`${styles.gaugeText} ${variant === 'danger' ? styles.dangerText : ''}`}
            x="50"
            y="64"
            textAnchor="middle"
          >
            {percent}%
          </text>
          <text className={styles.endpointLabel} x="-3" y="76" textAnchor="middle">0</text>
          {maxValue != null && (
            <text className={styles.endpointLabel} x="103" y="76" textAnchor="middle">
              {maxValue.toLocaleString()}
            </text>
          )}
        </svg>
        {icon && (
          <div className={`${styles.iconOverlay} ${variant === 'danger' ? styles.dangerIcon : ''}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={styles.title}>{title}</div>
      <div className={`${styles.value} ${variant === 'danger' ? styles.dangerValue : ''}`}>{valueLabel}</div>
    </div>
  );
}
