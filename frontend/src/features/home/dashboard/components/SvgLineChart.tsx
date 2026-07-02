import { useId } from 'react';
import styles from '../styles/SvgLineChart.module.css';
import type { DailyDataPoint } from '../types';

const VIEW_W = 480;
const VIEW_H = 150;
const PAD_TOP = 20;
const PAD_BOTTOM = 18;
const PAD_H = 30;
const CHART_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

const BG_COLORS = ['#f59e0b', '#a78bfa'] as const;

// Minimum horizontal spacing (in px) between consecutive points before the chart scrolls instead of squeezing.
const MIN_PX_PER_POINT = 26;

function toY(value: number, maxValue: number): number {
  return PAD_TOP + (1 - value / maxValue) * CHART_H;
}

function seriesPath(series: DailyDataPoint[], maxValue: number, totalDays: number): string {
  const xStep = (VIEW_W - PAD_H * 2) / Math.max(totalDays - 1, 1);
  return series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${PAD_H + i * xStep} ${toY(d.value, maxValue || 1)}`)
    .join(' ');
}

type BackgroundSeries = {
  label: string;
  data: DailyDataPoint[];
};

type SvgLineChartProps = {
  data: DailyDataPoint[];
  backgroundSeries?: BackgroundSeries[];
  color?: string;
  currentSeasonLabel?: string;
};

export function SvgLineChart({
  data,
  backgroundSeries = [],
  color = 'var(--color-text-accent)',
  currentSeasonLabel = 'Current season',
}: SvgLineChartProps): JSX.Element {
  const uid = useId();
  const gradientId = `lg${uid}`;
  const radialId = `rg${uid}`;

  if (!data.length) return <></>;

  const allSeries = [data, ...backgroundSeries.map((s) => s.data)];
  const maxValue = Math.max(...allSeries.flatMap((s) => s.map((d) => d.value)));
  const totalDays = Math.max(...allSeries.map((s) => s.length));
  const xStep = (VIEW_W - PAD_H * 2) / Math.max(totalDays - 1, 1);
  const minChartWidthPx = PAD_H * 2 + Math.max(totalDays - 1, 0) * MIN_PX_PER_POINT;

  const points = data.map((d, i) => ({
    x: PAD_H + i * xStep,
    y: toY(d.value, maxValue || 1),
    value: d.value,
    label: d.label,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const yLabels = [
    maxValue.toLocaleString(),
    Math.round(maxValue * 0.75).toLocaleString(),
    Math.round(maxValue * 0.5).toLocaleString(),
    Math.round(maxValue * 0.25).toLocaleString(),
    '0',
  ];

  return (
    <div className={styles.chartRoot}>
      {backgroundSeries.length > 0 && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <svg width="20" height="4" style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: 4 }}>
              <line x1="0" y1="2" x2="20" y2="2" stroke={color} strokeWidth="3" strokeLinecap="round" />
            </svg>
            {currentSeasonLabel}
          </span>
          {backgroundSeries.map((s, si) => (
            <span key={si} className={styles.legendItem} style={{ color: BG_COLORS[si % BG_COLORS.length] }}>
              <svg width="20" height="4" style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: 4 }}>
                <line
                  x1="0"
                  y1="2"
                  x2="20"
                  y2="2"
                  stroke={BG_COLORS[si % BG_COLORS.length]}
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className={styles.wrapper}>
        <div className={styles.yAxis}>
          {yLabels.map((lbl, i) => (
            <span key={i}>{lbl}</span>
          ))}
        </div>
        <div className={styles.chartArea}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={styles.svg}
            preserveAspectRatio="none"
            style={{ minWidth: `${minChartWidthPx}px` }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d5830" stopOpacity="1" />
                <stop offset="20%" stopColor="#739665" stopOpacity="1" />
                <stop offset="60%" stopColor="#a8c0a3" stopOpacity="1" />
                <stop offset="100%" stopColor="#b5c8b0" stopOpacity="1" />
              </linearGradient>
              <radialGradient id={radialId} cx="50%" cy="0%" rx="100%" ry="80%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            {points.length > 0 && (() => {
              const bottomY = VIEW_H - PAD_BOTTOM;
              const areaD =
                `M 0 ${bottomY} ` +
                `L ${points[0].x} ${bottomY} ` +
                points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                ` L ${points[points.length - 1].x} ${bottomY} L ${VIEW_W} ${bottomY} Z`;
              return (
                <g>
                  <path d={areaD} fill={`url(#${gradientId})`} />
                  <path d={areaD} fill={`url(#${radialId})`} />
                </g>
              );
            })()}
            {backgroundSeries.map((s, si) => {
              const bgColor = BG_COLORS[si % BG_COLORS.length];
              const bgXStep = (VIEW_W - PAD_H * 2) / Math.max(totalDays - 1, 1);
              const bgPoints = s.data.map((d, i) => ({
                x: PAD_H + i * bgXStep,
                y: toY(d.value, maxValue || 1),
              }));
              return (
                <g key={si} opacity="0.6">
                  <path
                    d={seriesPath(s.data, maxValue, totalDays)}
                    fill="none"
                    stroke={bgColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                  />
                  {bgPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={bgColor} />
                  ))}
                </g>
              );
            })}
            <path d={pathD} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill={color} />
                <text
                  x={p.x}
                  y={p.y - 8}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                  fill="var(--color-text-main)"
                >
                  {p.value.toLocaleString()}
                </text>
                <text x={p.x} y={VIEW_H - 2} fontSize="11" textAnchor="middle" fill="var(--color-text-muted)">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
