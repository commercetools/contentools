import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from '../RichTextContent';

export interface FooterBlockProps {
  column1: string;
  column2: string;
  column3: string;
  copyright: string;
}

export const renderFooterBlock: NonNullable<ComponentConfig<FooterBlockProps>['render']> = ({ column1, column2, column3, copyright }) => {
  const columns = [column1, column2, column3].filter(Boolean);
  return (
    <footer style={{ background: '#333', color: '#eee', padding: '2rem 1rem', marginTop: '3rem' }}>
      {columns.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: '2rem',
            maxWidth: '1200px',
            margin: '0 auto 2rem',
          }}
        >
          {columns.map((html, i) => (
            <RichTextContent
              key={i}
              html={html}
              style={{ fontSize: '0.9rem', lineHeight: 1.6 }}
            />
          ))}
        </div>
      )}
      {copyright && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#999', margin: 0 }}>
          {copyright}
        </p>
      )}
    </footer>
  );
};
