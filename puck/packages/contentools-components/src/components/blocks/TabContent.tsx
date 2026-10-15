import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from '../RichTextContent';

export interface TabContentProps {
  tabLabel: string;
  content: string;
}

export const renderTabContent: NonNullable<
  ComponentConfig<TabContentProps>['render']
> = ({ tabLabel, content }) => {
  if (!content) return <></>;
  return (
    <div style={{ padding: '1.5rem 0', lineHeight: 1.6, color: '#333' }}>
      {tabLabel && <h3 style={{ marginBottom: '1rem' }}>{tabLabel}</h3>}
      <RichTextContent html={content} />
    </div>
  );
};
