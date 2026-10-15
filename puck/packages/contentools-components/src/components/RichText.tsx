import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from './RichTextContent';

export interface RichTextProps {
  content: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: string;
  padding?: string;
}

export const renderRichText: NonNullable<ComponentConfig<RichTextProps>['render']> = ({
  content,
  align,
  maxWidth,
  padding,
}) => (
  <RichTextContent
    html={content}
    style={{
      padding: padding ?? '32px',
      textAlign: align ?? 'left',
      maxWidth: maxWidth,
      margin: maxWidth ? '0 auto' : undefined,
      boxSizing: 'border-box',
    }}
  />
);
