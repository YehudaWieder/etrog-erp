const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_PREFIX = 'range:';

export type DayFilterValue =
  | { mode: 'all' }
  | { mode: 'day'; date: string }
  | { mode: 'range'; from: string; to: string };

export function encodeDayRangeFilterValue(from: string, to: string): string {
  return from <= to ? `${RANGE_PREFIX}${from}:${to}` : `${RANGE_PREFIX}${to}:${from}`;
}

export function parseDayFilterValue(raw: string | null | undefined): DayFilterValue {
  if (!raw || raw === 'all') {
    return { mode: 'all' };
  }

  if (raw.startsWith(RANGE_PREFIX)) {
    const [from, to] = raw.slice(RANGE_PREFIX.length).split(':');
    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      return from <= to ? { mode: 'range', from, to } : { mode: 'range', from: to, to: from };
    }
    return { mode: 'all' };
  }

  return DATE_RE.test(raw) ? { mode: 'day', date: raw } : { mode: 'all' };
}

/**
 * Validates a raw day-filter value, normalizing anything malformed back to 'all'.
 * Use this in place of a plain regex check so range values survive filter parsing.
 */
export function normalizeDayFilterValue(raw: string | null | undefined): string {
  const parsed = parseDayFilterValue(raw);
  if (parsed.mode === 'all') return 'all';
  if (parsed.mode === 'day') return parsed.date;
  return encodeDayRangeFilterValue(parsed.from, parsed.to);
}

export function matchesDayFilterValue(dateValue: string | null | undefined, raw: string | null | undefined): boolean {
  const filter = parseDayFilterValue(raw);
  if (filter.mode === 'all') return true;

  const key = (dateValue ?? '').slice(0, 10);
  if (!key) return false;

  if (filter.mode === 'day') return key === filter.date;
  return key >= filter.from && key <= filter.to;
}
