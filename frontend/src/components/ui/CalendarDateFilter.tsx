import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './styles/CalendarDateFilter.module.css';

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

  const availableDates = useMemo(
    () => new Set(options.filter((o) => o.value !== 'all' && o.value).map((o) => o.value)),
    [options],
  );

  const initialViewDate = useMemo(() => {
    if (value !== 'all' && value) {
      return new Date(value + 'T00:00:00');
    }
    const sorted = [...availableDates].sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? new Date(sorted[0] + 'T00:00:00') : new Date();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
  const hasAutoNavigatedRef = useRef(false);

  useEffect(() => {
    if (value !== 'all' && value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (hasAutoNavigatedRef.current) return;
    if (value !== 'all' && value) return;
    if (availableDates.size === 0) return;
    hasAutoNavigatedRef.current = true;
    const sorted = [...availableDates].sort((a, b) => b.localeCompare(a));
    const d = new Date(sorted[0] + 'T00:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [availableDates, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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

  const selectedLabel = useMemo(() => {
    if (!value || value === 'all') return options.find((o) => o.value === 'all')?.label ?? label;
    return options.find((o) => o.value === value)?.label ?? value;
  }, [value, options, label]);

  const allLabel = options.find((o) => o.value === 'all')?.label ?? (lang === 'he' ? 'כל התאריכים' : 'All dates');

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
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
              const isSelected = value === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    styles.day,
                    hasData ? styles.dayAvailable : styles.dayUnavailable,
                    isSelected ? styles.daySelected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (hasData) { onChange(key); setIsOpen(false); }
                  }}
                  disabled={!hasData}
                  aria-pressed={isSelected}
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
              className={[styles.allBtn, value === 'all' ? styles.allBtnActive : ''].filter(Boolean).join(' ')}
              onClick={() => { onChange('all'); setIsOpen(false); }}
            >
              {allLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
