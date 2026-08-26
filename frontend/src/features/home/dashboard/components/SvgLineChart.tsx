import { useEffect, useId, useRef, useState } from 'react';
import styles from '../styles/SvgLineChart.module.css';
import type { DailyDataPoint } from '../types';

const PAD_TOP = 24;
const PAD_BOTTOM = 20;
const PAD_H = 24;

const BG_COLORS = ['#f59e0b', '#a78bfa'] as const;

// Minimum horizontal spacing (in real px) between consecutive points before the chart scrolls instead of squeezing.
const MIN_PX_PER_POINT = 56;
// Approximate real px width a value/date label needs so neighboring labels don't overlap.
const LABEL_WIDTH_PX = 48;
// Reserved height for the horizontal scrollbar (styled to a fixed thin height in CSS) so it
// doesn't cover the bottom date labels.
const SCROLLBAR_RESERVE_PX = 10;

function toY(value: number, maxValue: number, chartH: number): number {
  return PAD_TOP + (1 - value / maxValue) * chartH;
}

function seriesPath(series: DailyDataPoint[], maxValue: number, totalDays: number, width: number, chartH: number): string {
  const xStep = (width - PAD_H * 2) / Math.max(totalDays - 1, 1);
  return series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${PAD_H + i * xStep} ${toY(d.value, maxValue || 1, chartH)}`)
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data.length) return <></>;

  const allSeries = [data, ...backgroundSeries.map((s) => s.data)];
  const maxValue = Math.max(...allSeries.flatMap((s) => s.map((d) => d.value)));
  const totalDays = Math.max(...allSeries.map((s) => s.length));

  const minChartWidthPx = PAD_H * 2 + Math.max(totalDays - 1, 0) * MIN_PX_PER_POINT;
  const viewW = Math.max(containerSize.width, minChartWidthPx, 1);
  const needsHorizontalScroll = viewW > containerSize.width + 0.5;
  const viewH = Math.max(containerSize.height - (needsHorizontalScroll ? SCROLLBAR_RESERVE_PX : 0), 1);
  const chartH = Math.max(viewH - PAD_TOP - PAD_BOTTOM, 1);

  const xStep = (viewW - PAD_H * 2) / Math.max(totalDays - 1, 1);
  // Skip labels when points are too close together to avoid overlapping text.
  const labelStride = Math.max(1, Math.ceil(LABEL_WIDTH_PX / xStep));

  const points = data.map((d, i) => ({
    x: PAD_H + i * xStep,
    y: toY(d.value, maxValue || 1, chartH),
    value: d.value,
    label: d.label,
    showLabel: i % labelStride === 0 || i === data.length - 1,
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
        <div className={styles.chartArea} ref={containerRef}>
          {containerSize.width > 0 && containerSize.height > 0 && (
            <svg
              viewBox={`0 0 ${viewW} ${viewH}`}
              width={viewW}
              height={viewH}
              className={styles.svg}
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
                const bottomY = viewH - PAD_BOTTOM;
                const areaD =
                  `M 0 ${bottomY} ` +
                  `L ${points[0].x} ${bottomY} ` +
                  points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                  ` L ${points[points.length - 1].x} ${bottomY} L ${viewW} ${bottomY} Z`;
                return (
                  <g>
                    <path d={areaD} fill={`url(#${gradientId})`} />
                    <path d={areaD} fill={`url(#${radialId})`} />
                  </g>
                );
              })()}
              {backgroundSeries.map((s, si) => {
                const bgColor = BG_COLORS[si % BG_COLORS.length];
                const bgPoints = s.data.map((d, i) => ({
                  x: PAD_H + i * xStep,
                  y: toY(d.value, maxValue || 1, chartH),
                }));
                return (
                  <g key={si} opacity="0.6">
                    <path
                      d={seriesPath(s.data, maxValue, totalDays, viewW, chartH)}
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
                  <circle cx={p.x} cy={p.y} r="4" fill={color} />
                  {p.showLabel && (
                    <>
                      <text
                        x={p.x}
                        y={p.y - 10}
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="bold"
                        fill="var(--color-text-main)"
                      >
                        {p.value.toLocaleString()}
                      </text>
                      <text x={p.x} y={viewH - 4} fontSize="11" textAnchor="middle" fill="var(--color-text-muted)">
                        {p.label}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
