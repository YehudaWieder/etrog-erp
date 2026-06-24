import styles from '../styles/SvgBarChart.module.css';
import type { DistributionBar } from '../types';

type SvgBarChartProps = {
  data: DistributionBar[];
  barColor?: string;
  highlightLabels?: string[];
  highlightColor?: string;
};

function toBarGradient(color: string): string {
  if (color.startsWith('var(')) {
    return `linear-gradient(to top, color-mix(in srgb, ${color} 35%, transparent), ${color})`;
  }
  return `linear-gradient(to top, ${color}59, ${color})`;
}

export function SvgBarChart({ data, barColor, highlightLabels, highlightColor = 'var(--color-warning, #f59e0b)' }: SvgBarChartProps): JSX.Element {
  if (!data.length) return <></>;

  const maxValue = Math.max(...data.map((d) => d.value));

  const yLabels = [
    maxValue.toLocaleString(),
    Math.round(maxValue * 0.75).toLocaleString(),
    Math.round(maxValue * 0.5).toLocaleString(),
    Math.round(maxValue * 0.25).toLocaleString(),
    '0',
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.yAxis}>
        {yLabels.map((lbl, i) => (
          <span key={i}>{lbl}</span>
        ))}
      </div>
      <div className={styles.barsArea}>
        {data.map((bar) => {
          const heightPct = maxValue > 0 ? (bar.value / maxValue) * 85 : 0;
          const isHighlighted = highlightLabels?.includes(bar.label);
        return (
            <div key={bar.label} className={styles.barCol}>
              <div
                className={styles.barFill}
                style={{
                  height: `${heightPct}%`,
                  ...(isHighlighted
                    ? { background: toBarGradient(highlightColor) }
                    : barColor
                      ? { background: toBarGradient(barColor) }
                      : {}),
                }}
              >
                <span className={styles.barTopText}>{bar.value.toLocaleString()}</span>
              </div>
              <span className={styles.axisLabel}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
