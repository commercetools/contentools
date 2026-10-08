import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface ButtonProps {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fontSize?: string;
  align?: 'left' | 'center' | 'right';
  openInNewTab?: boolean;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: { background: '#1a1a2e', color: '#fff', border: '2px solid #1a1a2e' },
  secondary: { background: '#e94560', color: '#fff', border: '2px solid #e94560' },
  outline: { background: 'transparent', color: '#1a1a2e', border: '2px solid #1a1a2e' },
};

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 16px', fontSize: '14px' },
  md: { padding: '10px 24px', fontSize: '16px' },
  lg: { padding: '14px 32px', fontSize: '18px' },
};

export const renderButton: NonNullable<ComponentConfig<ButtonProps>['render']> = ({
  label,
  href,
  variant = 'primary',
  size = 'md',
  fontSize,
  align = 'left',
  openInNewTab,
}) => (
  <div style={{ padding: '12px 16px', textAlign: align, boxSizing: 'border-box' }}>
    <a
      href={href ?? '#'}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-block',
        borderRadius: '4px',
        textDecoration: 'none',
        fontWeight: 600,
        cursor: 'pointer',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...(fontSize ? { fontSize } : {}),
      }}
    >
      {label}
    </a>
  </div>
);
