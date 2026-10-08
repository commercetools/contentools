import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderDivider, type DividerProps } from '@commercetools-demo/puck-components';
import { createSpacingUnitlessField } from '../../fields/sizeFields';

export type { DividerProps };

export const createDividerConfig = (
  intl: IntlShape
): ComponentConfig<DividerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.divider.label' }),
  fields: {
    lineStyle: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.divider.field.lineStyle' }),
      options: [
        { value: 'solid', label: intl.formatMessage({ id: 'Editor.cfg.divider.lineStyle.solid' }) },
        { value: 'dashed', label: intl.formatMessage({ id: 'Editor.cfg.divider.lineStyle.dashed' }) },
        { value: 'dotted', label: intl.formatMessage({ id: 'Editor.cfg.divider.lineStyle.dotted' }) },
      ],
    },
    spacing: createSpacingUnitlessField(intl.formatMessage({ id: 'Editor.cfg.divider.field.spacing' })),
  },
  defaultProps: { lineStyle: 'solid', spacing: '24' },
  render: renderDivider,
});
