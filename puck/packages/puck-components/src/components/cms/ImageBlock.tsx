import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';

export interface ImageBlockProps {
  image: string;
  caption: string;
  link: string;
}

export const renderImageBlock: NonNullable<ComponentConfig<ImageBlockProps>['render']> = ({ image, caption, link }) => {
  if (!image) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', background: '#f5f5f5', borderRadius: '4px' }}>
      <FormattedMessage id="Editor.noImageSelected" />
    </div>
  );
  const img = (
    <img
      src={image}
      alt={caption || 'Image'}
      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
    />
  );
  return (
    <figure style={{ margin: '1rem 0', textAlign: 'center' }}>
      {link ? <a href={link} style={{ display: 'inline-block' }}>{img}</a> : img}
      {caption && (
        <figcaption style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
