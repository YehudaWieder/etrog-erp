import { useEffect } from 'react';

type UseClickOutsideOptions<T extends HTMLElement> = {
  ref: React.RefObject<T | null>;
  enabled: boolean;
  onOutsideClick: () => void;
};

export function useClickOutside<T extends HTMLElement>({
  ref,
  enabled,
  onOutsideClick,
}: UseClickOutsideOptions<T>): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
        return;
      }

      onOutsideClick();
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [enabled, onOutsideClick, ref]);
}