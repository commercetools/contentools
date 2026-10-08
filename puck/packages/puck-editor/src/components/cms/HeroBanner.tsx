import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderHeroBanner, type HeroBannerProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';

export type { HeroBannerProps };

export const createHeroBannerConfig = (
  intl: IntlShape
): ComponentConfig<HeroBannerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.heroBanner.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.heroBanner.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.heroBanner.field.subtitle' }) },
    image: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.heroBanner.field.image' }),
      render: ({ value, onChange }) => (
        <ImagePickerField value={value ?? ''} onChange={onChange} />
      ),
    },
  },
  defaultProps: { title: '', subtitle: '', image: '' },
  render: renderHeroBanner,
});
