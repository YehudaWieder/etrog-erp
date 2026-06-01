import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { FaCalendarDays, FaCheck, FaCopy } from 'react-icons/fa6';
import { Calendar } from 'react-multi-date-picker';
import { formatGregorianDate, formatHebrewDate } from '../../utils/dateFormatting';
import { useClickOutside } from '../../hooks/useClickOutside';

type CalendarPopoverProps = {
  lang: 'he' | 'en';
};

export function CalendarPopover({ lang }: CalendarPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [copiedKey, setCopiedKey] = useState<'gregorian' | 'hebrew' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const handleOutsideClick = useCallback(() => {
    setOpen(false);
  }, []);

  useClickOutside({
    ref: popoverRef,
    enabled: open,
    onOutsideClick: handleOutsideClick,
  });

  const formattedGregorianDate = formatGregorianDate(selectedDate);
  const formattedHebrewDate = formatHebrewDate(selectedDate);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
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