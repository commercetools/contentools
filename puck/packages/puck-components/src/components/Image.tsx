import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';

export interface ImageProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: string;
  align?: 'left' | 'center' | 'right';
}

export const renderImage: NonNullable<ComponentConfig<ImageProps>['render']> = ({
  src,
  alt,
  caption,
  width,
  height,
  objectFit,
  borderRadius,
  align,
}) => (
  <figure
    style={{
      margin: 0,
      padding: '16px',
      textAlign: align ?? 'center',
      boxSizing: 'border-box',
    }}
  >
    {src ? (
      <img
        src={src}
        alt={alt ?? ''}
        style={{
          width: width ?? '100%',
          height: height,
          objectFit: objectFit ?? 'cover',
          borderRadius,
          display: 'inline-block',
          maxWidth: '100%',
        }}
      />
    ) : (
      <div
        style={{
          width: width ?? '100%',
          height: height ?? '200px',
          background: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '14px',
          borderRadius,
        }}
      >
        <FormattedMessage id="Editor.noImageSelected" />
      </div>
    )}
    {caption && (
      <figcaption
        style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}
      >
        {caption}
      </figcaption>
    )}
  </figure>
);
