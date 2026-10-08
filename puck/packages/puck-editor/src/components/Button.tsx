import type { ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderButton, type ButtonProps } from '@commercetools-demo/puck-components';
import { createFontSizeField } from '../fields/fontSizeField';

export type { ButtonProps };

export const createButtonConfig = (intl: IntlShape): ComponentConfig<ButtonProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.button.label' }),
  fields: {
    label: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.button.field.label' }) },
    href: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.button.field.href' }) },
    variant: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.button.field.variant' }),
      options: [
        { value: 'primary', label: intl.formatMessage({ id: 'Editor.cfg.button.variant.primary' }) },
        { value: 'secondary', label: intl.formatMessage({ id: 'Editor.cfg.button.variant.secondary' }) },
        { value: 'outline', label: intl.formatMessage({ id: 'Editor.cfg.button.variant.outline' }) },
      ],
    },
    size: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.button.field.size' }),
      options: [
        { value: 'sm', label: intl.formatMessage({ id: 'Editor.cfg.button.size.small' }) },
        { value: 'md', label: intl.formatMessage({ id: 'Editor.cfg.button.size.medium' }) },
        { value: 'lg', label: intl.formatMessage({ id: 'Editor.cfg.button.size.large' }) },
      ],
    },
    fontSize: createFontSizeField(intl, intl.formatMessage({ id: 'Editor.cfg.button.field.fontSize' })),
    align: {
      type: 'select',
      label: intl.formatMessage({ id: 'Editor.cfg.button.field.align' }),
      options: [
        { value: 'left', label: intl.formatMessage({ id: 'Editor.cfg.align.left' }) },
        { value: 'center', label: intl.formatMessage({ id: 'Editor.cfg.align.center' }) },
        { value: 'right', label: intl.formatMessage({ id: 'Editor.cfg.align.right' }) },
      ],
    },
    openInNewTab: { type: 'radio', label: intl.formatMessage({ id: 'Editor.cfg.button.field.openInNewTab' }), options: [
      { value: true, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.yes' }) },
      { value: false, label: intl.formatMessage({ id: 'Editor.cfg.yesNo.no' }) },
    ]},
  },
  defaultProps: {
    label: 'Click me',
    variant: 'primary',
    size: 'md',
    align: 'left',
    openInNewTab: false,
  },
  render: renderButton,
});
