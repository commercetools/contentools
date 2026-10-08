import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';

export interface VideoBlockProps {
  videoUrl: string;
  posterImage: string;
  title: string;
  caption: string;
}

export const renderVideoBlock: NonNullable<ComponentConfig<VideoBlockProps>['render']> = ({ videoUrl, posterImage, title, caption }) => {
  if (!videoUrl) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', background: '#f5f5f5', borderRadius: '8px' }}>
      <FormattedMessage id="Editor.noVideoUrlConfigured" />
    </div>
  );
  return (
    <div style={{ margin: '1.5rem 0' }}>
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          overflow: 'hidden',
          background: '#000',
          borderRadius: '8px',
        }}
      >
        <video
          src={videoUrl}
          poster={posterImage || undefined}
          controls
          preload="metadata"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      {title && <h4 style={{ marginTop: '0.75rem', fontSize: '1.1rem', color: '#333' }}>{title}</h4>}
      {caption && <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>{caption}</p>}
    </div>
  );
};
