import React from 'react';
import { DropZone, type ComponentConfig } from '@measured/puck';

export interface GridProps {
  columnCount?: 1 | 2 | 3 | 4 | 5 | 6;
  rowCount?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: string;
  padding?: string;
}

export const renderGrid: NonNullable<ComponentConfig<GridProps>['render']> = ({
  columnCount = 2,
  rowCount = 1,
  gap = '16px',
  padding = '16px',
}) => {
  const cols = Math.max(1, columnCount);
  const rows = Math.max(1, rowCount);
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, minmax(40px, auto))`,
        gap,
        padding,
        boxSizing: 'border-box',
      }}
    >
      {cells.map((i) => (
        <div key={i}>
          {/* Cells are indexed row-major: cell-0 = row 0 col 0, etc. */}
          <DropZone zone={`cell-${i}`} />
        </div>
      ))}
    </div>
  );
};
