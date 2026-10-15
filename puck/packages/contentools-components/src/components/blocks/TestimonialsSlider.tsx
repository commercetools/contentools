import React from 'react';
import type { ComponentConfig } from '@measured/puck';

export interface TestimonialsSliderProps {
  quote1: string; author1: string; role1: string;
  quote2: string; author2: string; role2: string;
  quote3: string; author3: string; role3: string;
}

export const renderTestimonialsSlider: NonNullable<
  ComponentConfig<TestimonialsSliderProps>['render']
> = (props) => {
  const items = [
    [props.quote1, props.author1, props.role1],
    [props.quote2, props.author2, props.role2],
    [props.quote3, props.author3, props.role3],
  ].filter(([q]) => q) as [string, string, string][];
  if (items.length === 0) return <></>;
  return (
    <div style={{ padding: '2rem 1rem', background: '#f9f9f9', borderRadius: '8px', margin: '1rem 0' }}>
      {items.map(([quote, author, role], i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? '2rem' : 0 }}>
          <blockquote
            style={{
              fontSize: '1.15rem',
              fontStyle: 'italic',
              color: '#444',
              margin: '0 0 0.75rem 0',
              paddingLeft: '1rem',
              borderLeft: '4px solid #2c5530',
            }}
          >
            {quote}
          </blockquote>
          {author && (
            <cite style={{ fontStyle: 'normal', fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
              — {author}
              {role && <span style={{ fontWeight: 'normal', color: '#666' }}> ({role})</span>}
            </cite>
          )}
        </div>
      ))}
    </div>
  );
};
