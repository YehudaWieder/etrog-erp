import React, { useRef } from 'react';
import { useUniformCardMinHeight } from '../../hooks/useUniformCardMinHeight';

type ManagementCardsGridProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

const ManagementCardsGrid: React.FC<ManagementCardsGridProps> = ({ children, className, style }) => {
  const listRef = useRef<HTMLUListElement | null>(null);
  useUniformCardMinHeight(listRef, children, '.seasons-manager__card');

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
