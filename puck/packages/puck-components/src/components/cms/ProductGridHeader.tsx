import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from '../RichTextContent';

export interface ProductGridHeaderProps {
  title: string;
  description: string;
}

export const renderProductGridHeader: NonNullable<ComponentConfig<ProductGridHeaderProps>['render']> = ({ title, description }) => (
  <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
    {title && (
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.75rem' }}>
        {title}
      </h1>
    )}
    {description && (
      <RichTextContent
        html={description}
        style={{ fontSize: '1rem', color: '#666', lineHeight: 1.5, maxWidth: '720px' }}
      />
    )}
  </div>
);
