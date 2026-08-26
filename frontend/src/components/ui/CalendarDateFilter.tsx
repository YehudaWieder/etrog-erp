import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './styles/CalendarDateFilter.module.css';
import { parseDayFilterValue, encodeDayRangeFilterValue } from '../../utils/dayRangeFilter.util';

type Option = { value: string; label: string };

type Props = {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  lang?: 'he' | 'en';
};

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarDateFilter({ id, label, value, options, onChange, lang = 'he' }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const parsedValue = useMemo(() => parseDayFilterValue(value), [value]);

  const availableDates = useMemo(
    () => new Set(options.filter((o) => o.value !== 'all' && o.value).map((o) => o.value)),
    [options],
  );

  const [mode, setMode] = useState<'day' | 'range'>(parsedValue.mode === 'range' ? 'range' : 'day');
  const [pendingRangeStart, setPendingRangeStart] = useState<string | null>(null);

  // Keep the mode toggle in sync with externally-driven value changes (e.g. URL, "all" reset),
  // but never while the user is mid-way through picking a range endpoint.
  useEffect(() => {
    if (pendingRangeStart) return;
    setMode(parsedValue.mode === 'range' ? 'range' : 'day');
  }, [parsedValue.mode, pendingRangeStart]);

  const initialViewDate = useMemo(() => {
    if (parsedValue.mode === 'day') return new Date(parsedValue.date + 'T00:00:00');
    if (parsedValue.mode === 'range') return new Date(parsedValue.to + 'T00:00:00');
    const sorted = [...availableDates].sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? new Date(sorted[0] + 'T00:00:00') : new Date();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
  const hasAutoNavigatedRef = useRef(false);

  useEffect(() => {
    if (parsedValue.mode === 'day') {
      const d = new Date(parsedValue.date + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    } else if (parsedValue.mode === 'range') {
      const d = new Date(parsedValue.to + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasAutoNavigatedRef.current) return;
    if (parsedValue.mode !== 'all') return;
    if (availableDates.size === 0) return;
    hasAutoNavigatedRef.current = true;
    const sorted = [...availableDates].sort((a, b) => b.localeCompare(a));
    const d = new Date(sorted[0] + 'T00:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [availableDates, parsedValue.mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setPendingRangeStart(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const monthLabelDate = new Date(viewYear, viewMonth, 1);
  const monthLabel = Number.isNaN(monthLabelDate.getTime())
    ? ''
    : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthLabelDate);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewYear, viewMonth]);

  const dayNames = useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 7 + i); // 2024-01-07 is Sunday
      names.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d));
    }
    return names;
  }, [locale]);

  const formatDisplayDate = (key: string) => {
    const d = new Date(key + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return key;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };

  const rangeSeparator = lang === 'he' ? ' עד ' : ' – ';

  const selectedLabel = useMemo(() => {
    if (parsedValue.mode === 'all') return options.find((o) => o.value === 'all')?.label ?? label;
    if (parsedValue.mode === 'day') return options.find((o) => o.value === parsedValue.date)?.label ?? parsedValue.date;
    return `${formatDisplayDate(parsedValue.from)}${rangeSeparator}${formatDisplayDate(parsedValue.to)}`;
  }, [parsedValue, options, label]); // eslint-disable-line react-hooks/exhaustive-deps

  const allLabel = options.find((o) => o.value === 'all')?.label ?? (lang === 'he' ? 'כל התאריכים' : 'All dates');
  const singleModeLabel = lang === 'he' ? 'יום בודד' : 'Single day';
  const rangeModeLabel = lang === 'he' ? 'טווח ימים' : 'Date range';
  const pickRangeEndHint = lang === 'he' ? 'בחר תאריך סיום' : 'Pick an end date';

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleModeChange = (nextMode: 'day' | 'range') => {
    setMode(nextMode);
    setPendingRangeStart(null);
  };

  const handleDayClick = (key: string) => {
    if (mode === 'day') {
      onChange(key);
      setIsOpen(false);
      return;
    }

    if (!pendingRangeStart) {
      setPendingRangeStart(key);
      return;
    }

    onChange(encodeDayRangeFilterValue(pendingRangeStart, key));
    setPendingRangeStart(null);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className={`seasons-manager__year-input ${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={styles.triggerText}>{selectedLabel}</span>
        <span className={styles.triggerChevron} aria-hidden>▾</span>
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label={label}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={[styles.modeBtn, mode === 'day' ? styles.modeBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => handleModeChange('day')}
            >
              {singleModeLabel}
            </button>
            <button
              type="button"
              className={[styles.modeBtn, mode === 'range' ? styles.modeBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => handleModeChange('range')}
            >
              {rangeModeLabel}
            </button>
          </div>

          {mode === 'range' && pendingRangeStart && (
            <div className={styles.rangeHint}>{pickRangeEndHint}</div>
          )}

          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label={lang === 'he' ? 'חודש קודם' : 'Previous month'}>
              ‹
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label={lang === 'he' ? 'חודש הבא' : 'Next month'}>
              ›
            </button>
          </div>

          <div className={styles.grid}>
            {dayNames.map((name) => (
              <div key={name} className={styles.dayName}>{name}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className={styles.dayEmpty} />;
              }
              const key = formatDateKey(day);
              const hasData = availableDates.has(key);

              let isSelected = false;
              let isRangeEdge = false;
              let isInRange = false;
              if (mode === 'day') {
                isSelected = parsedValue.mode === 'day' && parsedValue.date === key;
              } else if (pendingRangeStart) {
                isSelected = key === pendingRangeStart;
              } else if (parsedValue.mode === 'range') {
                isRangeEdge = key === parsedValue.from || key === parsedValue.to;
                isInRange = key > parsedValue.from && key < parsedValue.to;
              }

              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    styles.day,
                    hasData ? styles.dayAvailable : styles.dayUnavailable,
                    isSelected || isRangeEdge ? styles.daySelected : '',
                    isInRange ? styles.dayInRange : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (hasData) handleDayClick(key);
                  }}
                  disabled={!hasData}
                  aria-pressed={isSelected || isRangeEdge}
                >
                  {day.getDate()}
                  {hasData && <span className={styles.dot} />}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={[styles.allBtn, parsedValue.mode === 'all' ? styles.allBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => { onChange('all'); setPendingRangeStart(null); setIsOpen(false); }}
            >
              {allLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
