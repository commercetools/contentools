import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { useIntl } from 'react-intl';

export interface NewsletterSignupProps {
  title: string;
  subtitle: string;
  ctaText: string;
  placeholder: string;
}

export const renderNewsletterSignup: NonNullable<
  ComponentConfig<NewsletterSignupProps>['render']
> = ({ title, subtitle, ctaText, placeholder }) => {
  const intl = useIntl();
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        background: '#f5f5f5',
        borderRadius: '8px',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {title && <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#333' }}>{title}</h3>}
      {subtitle && <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem' }}>{subtitle}</p>}
      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <input
          type="email"
          placeholder={placeholder}
          aria-label={intl.formatMessage({ id: 'Editor.newsletterEmailAria' })}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
            minWidth: '200px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2c5530',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ctaText || 'Subscribe'}
        </button>
      </form>
    </div>
  );
};
