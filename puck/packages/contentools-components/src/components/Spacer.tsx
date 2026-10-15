import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface SpacerProps {
  height?: string;
  showLine?: boolean;
  lineColor?: string;
}

export const renderSpacer: NonNullable<ComponentConfig<SpacerProps>['render']> = ({
  height = '48px',
  showLine = false,
  lineColor = '#e0e0e0',
}) => (
  <div
    style={{
      height,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      boxSizing: 'border-box',
    }}
  >
    {showLine && (
      <hr style={{ width: '100%', border: 'none', borderTop: `1px solid ${lineColor}` }} />
    )}
  </div>
);
