/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import React from 'react';
import type { ComponentConfig } from '@measured/puck';
import { RichTextContent } from '../RichTextContent';

export interface TextBlockProps {
  content: string;
}

export const renderTextBlock: NonNullable<ComponentConfig<TextBlockProps>['render']> = ({ content }) => {
  if (!content) return <></>;
  return (
    <RichTextContent
      html={content}
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        lineHeight: 1.6,
        color: '#333',
      }}
    />
  );
};
