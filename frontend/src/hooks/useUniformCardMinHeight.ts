import { useEffect } from 'react';

export function useUniformCardMinHeight(
  listRef: React.RefObject<HTMLElement | null>,
  children: React.ReactNode,
  itemSelector: string,
): void {
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) {
      return;
    }

    let animationFrameId = 0;

    const applyUniformMinHeight = () => {
      const cards = Array.from(listElement.querySelectorAll<HTMLElement>(itemSelector));

      if (cards.length === 0) {
        listElement.style.removeProperty('--uniform-card-min-height');
        return;
      }

      cards.forEach((card) => {
        card.style.minHeight = '';
      });

      const maxHeight = cards.reduce((maxValue, card) => Math.max(maxValue, card.offsetHeight), 0);
      if (maxHeight > 0) {
        listElement.style.setProperty('--uniform-card-min-height', `${maxHeight}px`);
      }
    };

    const scheduleRecalculate = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        applyUniformMinHeight();
      });
    };

    scheduleRecalculate();

    const resizeObserver = new ResizeObserver(() => {
      scheduleRecalculate();
    });

    const cards = Array.from(listElement.querySelectorAll<HTMLElement>(itemSelector));
    cards.forEach((card) => resizeObserver.observe(card));

    const mutationObserver = new MutationObserver(() => {
      resizeObserver.disconnect();
      const nextCards = Array.from(listElement.querySelectorAll<HTMLElement>(itemSelector));
      nextCards.forEach((card) => resizeObserver.observe(card));
      scheduleRecalculate();
    });

    mutationObserver.observe(listElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', scheduleRecalculate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', scheduleRecalculate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [children, itemSelector, listRef]);
}