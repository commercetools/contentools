import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface EmptyStateProps {
  image: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export const renderEmptyState: NonNullable<ComponentConfig<EmptyStateProps>['render']> = ({ image, title, description, ctaText, ctaLink }) => (
  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
    {image && (
      <img
        src={image}
        alt={title || 'Empty state'}
        style={{ maxWidth: '200px', height: 'auto', marginBottom: '1.5rem', opacity: 0.8 }}
      />
    )}
    {title && <h2 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '0.5rem' }}>{title}</h2>}
    {description && (
      <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
        {description}
      </p>
    )}
    {ctaText && ctaLink && (
      <a
        href={ctaLink}
        style={{
          display: 'inline-block',
          background: '#2c5530',
          color: 'white',
          padding: '0.75rem 2rem',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        {ctaText}
      </a>
    )}
  </div>
);
