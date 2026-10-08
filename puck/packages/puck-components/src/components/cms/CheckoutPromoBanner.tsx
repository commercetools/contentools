import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface CheckoutPromoBannerProps {
  title: string;
  message: string;
  ctaText: string;
  ctaLink: string;
}

export const renderCheckoutPromoBanner: NonNullable<
  ComponentConfig<CheckoutPromoBannerProps>['render']
> = ({ title, message, ctaText, ctaLink }) => {
  if (!title && !message && !ctaText) return <></>;
  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        background: '#f0f7f0',
        border: '1px solid #c8e6c8',
        borderRadius: '4px',
        marginBottom: '1rem',
        fontSize: '0.95rem',
      }}
    >
      {title && (
        <div style={{ fontWeight: 600, color: '#2c5530', marginBottom: '0.25rem' }}>
          {title}
        </div>
      )}
      {message && <p style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{message}</p>}
      {ctaText && ctaLink && (
        <a href={ctaLink} style={{ color: '#2c5530', fontWeight: 600, textDecoration: 'none' }}>
          {ctaText}
        </a>
      )}
    </div>
  );
};
