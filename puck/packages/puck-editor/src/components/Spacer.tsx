import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderSpacer, type SpacerProps } from '@commercetools-demo/puck-components';
import { ColorPickerField } from '../fields/ColorPickerField';
import { createSpacerHeightField } from '../fields/sizeFields';

export type { SpacerProps };

export const createSpacerConfig = (intl: IntlShape): ComponentConfig<SpacerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.spacer.label' }),
  fields: {
    height: createSpacerHeightField(intl.formatMessage({ id: 'Editor.cfg.spacer.field.height' })),
    showLine: {
      type: 'radio',
      label: intl.formatMessage({ id: 'Editor.cfg.spacer.field.showLine' }),
      options: [
        { value: true, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.yes' }) },
        { value: false, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.no' }) },
      ],
    },
    lineColor: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.spacer.field.lineColor' }),
      render: ({ value, onChange }) => <ColorPickerField value={value} onChange={onChange} />,
    },
  },
  defaultProps: {
    height: '48px',
    showLine: false,
    lineColor: '#e0e0e0',
  },
  render: renderSpacer,
});
