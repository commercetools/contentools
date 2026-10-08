import React from 'react';
import { DropZone, type ComponentConfig } from '@measured/puck';

export interface ColumnsProps {
  columnCount?: 2 | 3 | 4;
  gap?: string;
  padding?: string;
}

export const renderColumns: NonNullable<ComponentConfig<ColumnsProps>['render']> = ({
  columnCount = 2,
  gap = '16px',
  padding = '16px',
}) => {
  const cols = Array.from({ length: columnCount }, (_, i) => i);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap,
        padding,
        boxSizing: 'border-box',
      }}
    >
      {cols.map((i) => (
        <div key={i}>
          <DropZone zone={`column-${i}`} />
        </div>
      ))}
    </div>
  );
};
