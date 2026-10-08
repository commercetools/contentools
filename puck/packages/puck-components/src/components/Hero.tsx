import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface HeroProps {
  heading: string;
  headingFontSize?: string;
  subheading?: string;
  subheadingFontSize?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaUrl?: string;
  layout?: 'centered' | 'left-aligned';
  minHeight?: string;
}

export const renderHero: NonNullable<ComponentConfig<HeroProps>['render']> = ({
  heading,
  headingFontSize,
  subheading,
  subheadingFontSize,
  backgroundImage,
  ctaText,
  ctaUrl,
  layout,
  minHeight,
}) => {
  const isCenter = layout !== 'left-aligned';
  return (
    <section
      style={{
        position: 'relative',
        minHeight: minHeight ?? '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCenter ? 'center' : 'flex-start',
        padding: '48px 32px',
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: backgroundImage ? undefined : '#1a1a2e',
        color: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {backgroundImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          maxWidth: '720px',
          textAlign: isCenter ? 'center' : 'left',
        }}
      >
        <h1 style={{ margin: '0 0 16px', fontSize: headingFontSize || '2.5rem', fontWeight: 700 }}>
          {heading}
        </h1>
        {subheading && (
          <p style={{ margin: '0 0 24px', fontSize: subheadingFontSize || '1.2rem', opacity: 0.85 }}>
            {subheading}
          </p>
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#e94560',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
};
