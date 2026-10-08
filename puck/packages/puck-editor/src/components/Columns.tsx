import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderColumns, type ColumnsProps } from '@commercetools-demo/puck-components';

export type { ColumnsProps };

/**
 * @deprecated Use `Grid` instead (columns + rows). `Columns` is kept registered
 * for backward compatibility so pages saved with the original component (and its
 * `column-N` drop zones) keep rendering. Prefer Grid for new content.
 */
export const createColumnsConfig = (intl: IntlShape): ComponentConfig<ColumnsProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.columns.label' }),
  fields: {
    columnCount: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.columns.field.columnCount' }),
      options: [
        { value: 2, label: intl.formatMessage({ id: 'Editor.cfg.columns.count.2' }) },
        { value: 3, label: intl.formatMessage({ id: 'Editor.cfg.columns.count.3' }) },
        { value: 4, label: intl.formatMessage({ id: 'Editor.cfg.columns.count.4' }) },
      ],
    },
    gap: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.columns.field.gap' }) },
    padding: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.columns.field.padding' }) },
  },
  defaultProps: {
    columnCount: 2,
    gap: '16px',
    padding: '16px',
  },
  render: renderColumns,
});
