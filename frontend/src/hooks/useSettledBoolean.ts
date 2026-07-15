import { useEffect, useRef, useState } from 'react';

// Mirrors `value` immediately when it turns true, but holds onto `true` for `settleDelayMs`
// after it turns false. Bridges brief gaps (e.g. between sequential API calls that belong to
// the same logical page load) so a transient "not loading" blip doesn't flicker the UI off.
export function useSettledBoolean(value: boolean, settleDelayMs: number): boolean {
  const [settled, setSettled] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setSettled(true);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setSettled(false);
    }, settleDelayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, settleDelayMs]);

  return settled;
}
