import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderProductTeaser, type ProductTeaserProps } from '@commercetools-demo/puck-components';
import { DatasourceField } from '../fields/DatasourceField';
import { richTextField } from '../fields/RichTextField';
import { productLinkDefaults, createProductLinkFields } from './cms/shared';

export type { ProductTeaserProps };

export const createProductTeaserConfig = (
  intl: IntlShape
): ComponentConfig<ProductTeaserProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.productTeaser.label' }),
  fields: {
    datasource: {
      type: 'custom',
      label: intl.formatMessage({ id: 'Editor.cfg.productTeaser.field.datasource' }),
      render: ({ value, onChange }) => (
        <DatasourceField value={value} onChange={onChange} fixedType="product-by-sku" />
      ),
    },
    richText: richTextField(intl.formatMessage({ id: 'Editor.cfg.productTeaser.field.richText' })),
    ...createProductLinkFields(intl),
  },
  defaultProps: {
    datasource: { type: 'product-by-sku', skus: [''] },
    richText: '',
    ...productLinkDefaults,
  },
  render: renderProductTeaser,
});
