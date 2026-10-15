import React from 'react';

/**
 * Page content-width scale. `X` is the base column unit; each step doubles up
 * to a wide layout, and `full` removes the constraint (edge-to-edge).
 */
export type ContentWidth = 'x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'full';

export const CONTENT_WIDTHS: Record<ContentWidth, string> = {
  x: '256px',
  '2x': '512px',
  '3x': '768px',
  '4x': '1024px',
  '5x': '1280px',
  '6x': '1536px',
  full: '100%',
};

export interface RootProps {
  title?: string;
  backgroundColor?: string;
  contentWidth?: ContentWidth;
}

/**
 * Root render — the page wrapper. Applies the background and centres the content
 * column at the configured width. Nimbus-free (plain elements + inline styles).
 */
export const renderRoot = ({
  children,
  backgroundColor,
  contentWidth,
}: RootProps & { children?: React.ReactNode }): React.ReactElement => {
  const maxWidth = CONTENT_WIDTHS[contentWidth as ContentWidth] ?? '100%';
  const isConstrained = maxWidth !== '100%';
  return React.createElement(
    'div',
    {
      style: {
        background: backgroundColor ?? '#ffffff',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          maxWidth,
          // Centre the content column and give it breathing room on the sides
          // when its width is constrained.
          margin: '0 auto',
          paddingLeft: isConstrained ? '24px' : undefined,
          paddingRight: isConstrained ? '24px' : undefined,
          boxSizing: 'border-box',
        },
      },
      children
    )
  );
};
