import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderGrid, type GridProps } from '@commercetools-demo/puck-components';
import { createSpacingField } from '../fields/sizeFields';

export type { GridProps };

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: String(n),
}));

/**
 * Grid — a layout container that lays out a `columnCount` × `rowCount` matrix
 * of drop zones. Each cell is an independent Puck DropZone, so components can be
 * dropped into any cell. (Renamed from "Columns"; rows added.)
 *
 * This render function is shared by the editor and the Puck renderer
 * (puck-renderer runs the same config), so updating it here updates both.
 */
export const createGridConfig = (intl: IntlShape): ComponentConfig<GridProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.grid.label' }),
  fields: {
    columnCount: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.grid.field.columnCount' }),
      options: COUNT_OPTIONS,
    },
    rowCount: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.grid.field.rowCount' }),
      options: COUNT_OPTIONS,
    },
    gap: createSpacingField(intl.formatMessage({ id: 'Editor.cfg.grid.field.gap' })),
    padding: createSpacingField(intl.formatMessage({ id: 'Editor.cfg.grid.field.padding' })),
  },
  defaultProps: {
    columnCount: 2,
    rowCount: 1,
    gap: '16px',
    padding: '16px',
  },
  render: renderGrid,
});
