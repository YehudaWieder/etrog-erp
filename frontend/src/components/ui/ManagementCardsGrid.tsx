import React, { useEffect, useRef } from 'react';

type ManagementCardsGridProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const ManagementCardsGrid: React.FC<ManagementCardsGridProps> = ({ children, className, style }) => {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) {
      return;
    }

    let animationFrameId = 0;

    const applyUniformMinHeight = () => {
      const cards = Array.from(listElement.querySelectorAll<HTMLElement>('.seasons-manager__card'));

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

    const cards = Array.from(listElement.querySelectorAll<HTMLElement>('.seasons-manager__card'));
    cards.forEach((card) => resizeObserver.observe(card));

    const mutationObserver = new MutationObserver(() => {
      resizeObserver.disconnect();
      const nextCards = Array.from(listElement.querySelectorAll<HTMLElement>('.seasons-manager__card'));
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
  }, [children]);

  return (
    <ul
      ref={listRef}
      className={`seasons-manager__cards seasons-manager__cards--uniform${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </ul>
  );
};

export default ManagementCardsGrid;
