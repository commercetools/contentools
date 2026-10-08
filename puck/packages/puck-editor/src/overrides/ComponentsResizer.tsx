import React from 'react';
import { PanelResizer } from './PanelResizer';

export interface ComponentsResizerProps {
  /** Smallest allowed width in px. */
  minWidth?: number;
  /** Largest allowed width in px. */
  maxWidth?: number;
}

/**
 * Draggable divider that resizes the Puck components (left) panel.
 *
 * Thin wrapper over {@link PanelResizer} with `side="left"`. Render it as a
 * child of the `.puck-editor-fill` container. See PanelResizer for details.
 */
export const ComponentsResizer: React.FC<ComponentsResizerProps> = (props) => (
  <PanelResizer side="left" {...props} />
);
