import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderProductSlider, type ProductSliderProps } from '@commercetools-demo/puck-components';
import { DatasourceField } from '../../fields/DatasourceField';
import { createProductLinkFields, productLinkDefaults } from './shared';

export type { ProductSliderProps };

export const createProductSliderConfig = (
  intl: IntlShape
): ComponentConfig<ProductSliderProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.productSlider.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productSlider.field.title' }) },
    subtitle: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productSlider.field.subtitle' }) },
    products: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.productSlider.field.products' }),
      render: ({ value, onChange }) => <DatasourceField value={value} onChange={onChange} fixedType="products-by-sku" />,
    },
    ...createProductLinkFields(intl),
  },
  defaultProps: {
    title: '',
    subtitle: '',
    products: { type: 'products-by-sku', skus: [''] },
    ...productLinkDefaults,
  },
  render: renderProductSlider,
});
