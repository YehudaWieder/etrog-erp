import { useCallback, useRef } from 'react';

type UseHoverDetailsMenuResult = {
  cancelMenuClose: () => void;
  scheduleMenuClose: (menu: HTMLDetailsElement) => void;
  closeMenuFromTarget: (target: EventTarget | null) => void;
};

export function useHoverDetailsMenu(closeDelayMs = 180): UseHoverDetailsMenuResult {
  const timeoutRef = useRef<number | null>(null);

  const cancelMenuClose = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleMenuClose = useCallback((menu: HTMLDetailsElement) => {
    cancelMenuClose();
    timeoutRef.current = window.setTimeout(() => {
      menu.open = false;
      timeoutRef.current = null;
    }, closeDelayMs);
  }, [cancelMenuClose, closeDelayMs]);

  const closeMenuFromTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const menu = target.closest('.global-filters-bar__icon-menu');
    if (menu instanceof HTMLDetailsElement) {
      menu.open = false;
    }
  }, []);

  return { cancelMenuClose, scheduleMenuClose, closeMenuFromTarget };
}
