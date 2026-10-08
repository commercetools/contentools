import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface CategoryHeroProps {
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export const renderCategoryHero: NonNullable<
  ComponentConfig<CategoryHeroProps>['render']
> = ({ title, subtitle, image, ctaText, ctaLink }) => (
  <div
    style={{
      position: 'relative',
      minHeight: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f0f0',
      borderRadius: '8px',
      overflow: 'hidden',
      margin: '1rem 0',
    }}
  >
    {image && (
      <img
        src={image}
        alt={title || 'Category'}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: 0.85,
        }}
      />
    )}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '2rem',
        color: 'white',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      }}
    >
      {title && <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{title}</h1>}
      {subtitle && <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{subtitle}</p>}
      {ctaText && ctaLink && (
        <a
          href={ctaLink}
          style={{
            display: 'inline-block',
            background: 'white',
            color: '#2c5530',
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
  </div>
);
