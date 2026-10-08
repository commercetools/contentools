import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderProductBanner, type ProductBannerProps } from '@commercetools-demo/puck-components';
import { DatasourceField } from '../../fields/DatasourceField';
import { richTextField } from '../../fields/RichTextField';
import { ColorPickerField } from '../../fields/ColorPickerField';
import { productLinkDefaults, createProductLinkFields } from './shared';

export type { ProductBannerProps };

export const createProductBannerConfig = (
  intl: IntlShape
): ComponentConfig<ProductBannerProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.productBanner.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.title' }) },
    description: richTextField(intl.formatMessage({ id: 'Editor.cfg.productBanner.field.description' })),
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.ctaText' }) },
    ctaLink: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.ctaLink' }) },
    product: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.product' }),
      render: ({ value, onChange }) => <DatasourceField value={value} onChange={onChange} fixedType="product-by-sku" />,
    },
    productOnLeft: {
      type: 'radio', label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.productOnLeft' }),
      options: [
        { value: false, label: intl.formatMessage({ id: 'Editor.cfg.productBanner.productPosition.right' }) },
        { value: true, label: intl.formatMessage({ id: 'Editor.cfg.productBanner.productPosition.left' }) },
      ],
    },
    background: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.productBanner.field.background' }),
      render: ({ value, onChange }) => <ColorPickerField value={value} onChange={onChange} />,
    },
    ...createProductLinkFields(intl),
  },
  defaultProps: {
    title: '',
    description: '',
    ctaText: '',
    ctaLink: '',
    product: { type: 'product-by-sku', skus: [''] },
    productOnLeft: false,
    background: '#f5f5f5',
    ...productLinkDefaults,
  },
  render: renderProductBanner,
});
