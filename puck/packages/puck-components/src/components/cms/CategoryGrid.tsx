import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { FormattedMessage } from 'react-intl';

export interface CategoryGridProps {
  category1Image: string; category1Label: string; category1Link: string;
  category2Image: string; category2Label: string; category2Link: string;
  category3Image: string; category3Label: string; category3Link: string;
  category4Image: string; category4Label: string; category4Link: string;
}

export const renderCategoryGrid: NonNullable<ComponentConfig<CategoryGridProps>['render']> = (props) => {
    const categories = [
      [props.category1Image, props.category1Label, props.category1Link],
      [props.category2Image, props.category2Label, props.category2Link],
      [props.category3Image, props.category3Label, props.category3Link],
      [props.category4Image, props.category4Label, props.category4Link],
    ].filter(([, label, link]) => label && link) as [string, string, string][];

    if (categories.length === 0) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>
        <FormattedMessage id="Editor.noCategoriesConfigured" />
      </div>
    );

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5rem',
          padding: '2rem 1rem',
        }}
      >
        {categories.map(([image, label, link], i) => (
          <a
            key={i}
            href={link}
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ aspectRatio: '1', background: '#f0f0f0', overflow: 'hidden' }}>
              {image && (
                <img
                  src={image}
                  alt={label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <span
              style={{
                display: 'block',
                padding: '1rem',
                fontWeight: 600,
                color: '#333',
              }}
            >
              {label}
            </span>
          </a>
        ))}
      </div>
    );
};
