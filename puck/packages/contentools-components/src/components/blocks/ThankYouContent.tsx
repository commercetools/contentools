import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from '../RichTextContent';

export interface ThankYouContentProps {
  headline: string;
  message: string;
  ctaText: string;
  ctaLink: string;
}

export const renderThankYouContent: NonNullable<
  ComponentConfig<ThankYouContentProps>['render']
> = ({ headline, message, ctaText, ctaLink }) => (
  <div style={{ textAlign: 'center', padding: '3rem 1rem', maxWidth: '560px', margin: '0 auto' }}>
    {headline && (
      <h1 style={{ fontSize: '2rem', color: '#2c5530', marginBottom: '1rem' }}>{headline}</h1>
    )}
    {message && (
      <RichTextContent
        html={message}
        style={{ fontSize: '1rem', lineHeight: 1.6, color: '#555', marginBottom: '2rem' }}
      />
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
