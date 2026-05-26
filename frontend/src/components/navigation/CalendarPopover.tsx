import { useEffect, useId, useRef, useState } from 'react';
import { FaCalendarDays, FaCheck, FaCopy } from 'react-icons/fa6';
import { Calendar } from 'react-multi-date-picker';

type CalendarPopoverProps = {
  lang: 'he' | 'en';
};

const hebrewCalendarFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatHebrewNumber(value: number) {
  const normalizedValue = value >= 5000 ? value % 1000 : value;

  if (normalizedValue <= 0) {
    return String(value);
  }

  const parts: string[] = [];
  let remaining = normalizedValue;

  while (remaining >= 400) {
    parts.push('ת');
    remaining -= 400;
  }

  const hundreds = [
    { value: 300, symbol: 'ש' },
    { value: 200, symbol: 'ר' },
    { value: 100, symbol: 'ק' },
  ];

  for (const { value: partValue, symbol } of hundreds) {
    if (remaining >= partValue) {
      parts.push(symbol);
      remaining -= partValue;
    }
  }

  if (remaining === 15) {
    parts.push('טו');
    remaining = 0;
  } else if (remaining === 16) {
    parts.push('טז');
    remaining = 0;
  }

  const tens = [
    { value: 90, symbol: 'צ' },
    { value: 80, symbol: 'פ' },
    { value: 70, symbol: 'ע' },
    { value: 60, symbol: 'ס' },
    { value: 50, symbol: 'נ' },
    { value: 40, symbol: 'מ' },
    { value: 30, symbol: 'ל' },
    { value: 20, symbol: 'כ' },
    { value: 10, symbol: 'י' },
  ];

  for (const { value: partValue, symbol } of tens) {
    if (remaining >= partValue) {
      parts.push(symbol);
      remaining -= partValue;
    }
  }

  const ones = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  if (remaining > 0) {
    parts.push(ones[remaining - 1]);
  }

  return parts.join('');
}

function formatGregorianDate(value: Date) {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatHebrewDate(value: Date) {
  const parts = hebrewCalendarFormatter.formatToParts(value);
  const dayPart = parts.find((part) => part.type === 'day')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const yearPart = parts.find((part) => part.type === 'year')?.value;

  const dayNumber = dayPart ? Number(dayPart.replace(/\D/g, '')) : NaN;
  const yearNumber = yearPart ? Number(yearPart.replace(/\D/g, '')) : NaN;

  if (!monthPart || Number.isNaN(dayNumber) || Number.isNaN(yearNumber)) {
    return hebrewCalendarFormatter.format(value);
  }

  return `${formatHebrewNumber(dayNumber)} ${monthPart} ${formatHebrewNumber(yearNumber)}`;
}

export function CalendarPopover({ lang }: CalendarPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [copiedKey, setCopiedKey] = useState<'gregorian' | 'hebrew' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const formattedGregorianDate = formatGregorianDate(selectedDate);
  const formattedHebrewDate = formatHebrewDate(selectedDate);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copiedKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedKey(null);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedKey]);

  const handleCalendarChange = (value: unknown) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      return;
    }

    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      setSelectedDate(value.toDate());
    }
  };

  const handleToggle = () => {
    setOpen((currentOpen) => {
      if (!currentOpen) {
        setSelectedDate(new Date());
        setCopiedKey(null);
      }

      return !currentOpen;
    });
  };

  const handleCopyDate = async (key: 'gregorian' | 'hebrew', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <div className="calendar-popover" ref={popoverRef}>
      <button
        className={`nav-icon-btn${open ? ' is-open' : ''}`}
        type="button"
        aria-label={lang === 'he' ? 'לוח שנה משולב' : 'Dual calendar'}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleToggle}
      >
        <FaCalendarDays />
      </button>
      {open ? (
        <div
          className="calendar-popover__panel"
          id={popoverId}
          role="dialog"
          aria-label={lang === 'he' ? 'לוח שנה משולב עברי ולועזי' : 'Gregorian and Hebrew calendar'}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="calendar-popover__content">
            <div className="calendar-popover__summary">
              <div className="calendar-popover__summary-item">
                <span className="calendar-popover__summary-label">{lang === 'he' ? 'לועזי' : 'Gregorian'}</span>
                <div className="calendar-popover__summary-row">
                  <strong className="calendar-popover__summary-value">{formattedGregorianDate}</strong>
                  <button
                    className={`calendar-popover__copy-btn${copiedKey === 'gregorian' ? ' is-copied' : ''}`}
                    type="button"
                    aria-label={lang === 'he' ? 'העתק תאריך לועזי' : 'Copy Gregorian date'}
                    title={lang === 'he' ? 'העתק' : 'Copy'}
                    onClick={() => void handleCopyDate('gregorian', formattedGregorianDate)}
                  >
                    {copiedKey === 'gregorian' ? <FaCheck /> : <FaCopy />}
                  </button>
                </div>
              </div>
              <div className="calendar-popover__summary-item">
                <span className="calendar-popover__summary-label">{lang === 'he' ? 'עברי' : 'Hebrew'}</span>
                <div className="calendar-popover__summary-row">
                  <strong className="calendar-popover__summary-value">{formattedHebrewDate}</strong>
                  <button
                    className={`calendar-popover__copy-btn${copiedKey === 'hebrew' ? ' is-copied' : ''}`}
                    type="button"
                    aria-label={lang === 'he' ? 'העתק תאריך עברי' : 'Copy Hebrew date'}
                    title={lang === 'he' ? 'העתק' : 'Copy'}
                    onClick={() => void handleCopyDate('hebrew', formattedHebrewDate)}
                  >
                    {copiedKey === 'hebrew' ? <FaCheck /> : <FaCopy />}
                  </button>
                </div>
              </div>
            </div>
            <Calendar value={selectedDate} onChange={handleCalendarChange} className="calendar-popover__calendar" />
          </div>
        </div>
      ) : null}
    </div>
  );
}