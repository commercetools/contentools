import React from 'react';
import { PanelResizer } from './PanelResizer';

export interface PropertiesResizerProps {
  /** Smallest allowed width in px. */
  minWidth?: number;
  /** Largest allowed width in px. */
  maxWidth?: number;
}

/**
 * Draggable divider that resizes the Puck properties (right) panel.
 *
 * Thin wrapper over {@link PanelResizer} with `side="right"`. Render it as a
 * child of the `.puck-editor-fill` container. See PanelResizer for details.
 */
export const PropertiesResizer: React.FC<PropertiesResizerProps> = (props) => (
  <PanelResizer side="right" {...props} />
);
