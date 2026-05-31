import { useEffect, useState } from 'react';

export function useSeasonCardWidth(nonActiveCount: number, sortedCount: number) {
  const [secondaryCardWidth, setSecondaryCardWidth] = useState<number | null>(null);

  useEffect(() => {
    if (nonActiveCount === 0) {
      setSecondaryCardWidth(null);
      return;
    }

    const activeCardSelector = '.seasons-manager__cards--secondary-grid .seasons-manager__card';
    const secondaryCard = document.querySelector<HTMLElement>(activeCardSelector);

    if (!secondaryCard) {
      setSecondaryCardWidth(null);
      return;
    }

    const updateCardWidth = () => {
      const measuredWidth = Math.round(secondaryCard.getBoundingClientRect().width);
      setSecondaryCardWidth(measuredWidth > 0 ? measuredWidth : null);
    };

    updateCardWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateCardWidth();
    });

    resizeObserver.observe(secondaryCard);
    window.addEventListener('resize', updateCardWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCardWidth);
    };
  }, [nonActiveCount, sortedCount]);

  return secondaryCardWidth;
}
