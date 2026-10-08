import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderCrossSellBlock, type CrossSellBlockProps } from '@commercetools-demo/puck-components';
import { DatasourceField } from '../../fields/DatasourceField';
import { createProductLinkFields, productLinkDefaults } from './shared';

export type { CrossSellBlockProps };

export const createCrossSellBlockConfig = (
  intl: IntlShape
): ComponentConfig<CrossSellBlockProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.crossSellBlock.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.crossSellBlock.field.title' }) },
    products: {
      type: 'custom', label: intl.formatMessage({ id: 'Editor.cfg.crossSellBlock.field.products' }),
      render: ({ value, onChange }) => <DatasourceField value={value} onChange={onChange} fixedType="products-by-sku" />,
    },
    ctaText: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.crossSellBlock.field.ctaText' }) },
    ...createProductLinkFields(intl),
  },
  defaultProps: {
    title: 'Frequently bought together',
    products: { type: 'products-by-sku', skus: [''] },
    ctaText: '',
    ...productLinkDefaults,
  },
  render: renderCrossSellBlock,
});
