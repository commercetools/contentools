import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderPromotionalBanner, type PromotionalBannerProps } from '@commercetools-demo/puck-components';
import { ImagePickerField } from '../../fields/ImagePickerField';
import { ColorPickerField } from '../../fields/ColorPickerField';

export type { PromotionalBannerProps };

export const createPromotionalBannerConfig = (
  intl: IntlShape
): ComponentConfig<PromotionalBannerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.label' }),
  fields: {
    image: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.image' }),
      render: ({ value, onChange }) => <ImagePickerField value={value ?? ''} onChange={onChange} />,
    },
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.subtitle' }) },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.ctaLink' }) },
    background: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.promotionalBanner.field.background' }),
      render: ({ value, onChange }) => <ColorPickerField value={value} onChange={onChange} />,
    },
  },
  defaultProps: { image: '', title: '', subtitle: '', ctaText: '', ctaLink: '', background: '#f5f5f5' },
  render: renderPromotionalBanner,
});
