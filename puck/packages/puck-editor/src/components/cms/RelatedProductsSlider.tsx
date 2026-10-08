import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderRelatedProductsSlider, type RelatedProductsSliderProps } from '@commercetools-demo/puck-components';
import { DatasourceField } from '../../fields/DatasourceField';
import { createProductLinkFields, productLinkDefaults } from './shared';

export type { RelatedProductsSliderProps };

export const createRelatedProductsSliderConfig = (
  intl: IntlShape
): ComponentConfig<RelatedProductsSliderProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.relatedProducts.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.relatedProducts.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.relatedProducts.field.subtitle' }) },
    products: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.relatedProducts.field.products' }),
      render: ({ value, onChange }) => <DatasourceField value={value} onChange={onChange} fixedType="products-by-sku" />,
    },
    ...createProductLinkFields(intl),
  },
  defaultProps: {
    title: 'Related Products',
    subtitle: '',
    products: { type: 'products-by-sku', skus: [''] },
    ...productLinkDefaults,
  },
  render: renderRelatedProductsSlider,
});
