import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from './RichTextContent';

export interface CardProps {
  title: string;
  titleFontSize?: string;
  body?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  shadow?: boolean;
  borderRadius?: string;
}

export const renderCard: NonNullable<ComponentConfig<CardProps>['render']> = ({
  title,
  titleFontSize,
  body,
  imageUrl,
  ctaText,
  ctaUrl,
  shadow,
  borderRadius,
}) => (
  <div
    style={{
      border: '1px solid #e0e0e0',
      borderRadius: borderRadius ?? '8px',
      overflow: 'hidden',
      boxShadow: shadow ? '0 2px 8px rgba(0,0,0,0.12)' : undefined,
      background: '#fff',
      margin: '8px',
      boxSizing: 'border-box',
    }}
  >
    {imageUrl && (
      <img
        src={imageUrl}
        alt={title}
        style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
      />
    )}
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: titleFontSize || '1.1rem' }}>{title}</h3>
      {body && (
        <RichTextContent
          html={body}
          style={{ margin: '0 0 16px', color: '#555', fontSize: '14px' }}
        />
      )}
      {ctaText && ctaUrl && (
        <a
          href={ctaUrl}
          style={{
            color: '#e94560',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          {ctaText} →
        </a>
      )}
    </div>
  </div>
);
