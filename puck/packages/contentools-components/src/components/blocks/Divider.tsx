import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface DividerProps {
  lineStyle: 'solid' | 'dashed' | 'dotted';
  spacing: string;
}

export const renderDivider: NonNullable<ComponentConfig<DividerProps>['render']> = ({
  lineStyle,
  spacing,
}) => {
  const s = parseInt(spacing, 10) || 24;
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px ${lineStyle} #ddd`,
        margin: `${s / 2}px 0`,
      }}
    />
  );
};
