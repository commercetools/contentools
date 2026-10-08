import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderWebsiteLogo, type WebsiteLogoProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';
import { createLogoWidthField, createLogoHeightField } from '../../fields/sizeFields';

export type { WebsiteLogoProps };

export const createWebsiteLogoConfig = (
  intl: IntlShape
): ComponentConfig<WebsiteLogoProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.websiteLogo.label' }),
  fields: {
    logo: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.websiteLogo.field.logo' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    maxWidth: createLogoWidthField(intl.formatMessage({ id: 'Editor.cfg.websiteLogo.field.maxWidth' })),
    maxHeight: createLogoHeightField(intl.formatMessage({ id: 'Editor.cfg.websiteLogo.field.maxHeight' })),
  },
  defaultProps: { logo: '', maxWidth: '180', maxHeight: '50' },
  render: renderWebsiteLogo,
});
