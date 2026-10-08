import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderProductGridHeader, type ProductGridHeaderProps } from '@commercetools-demo/puck-components';
import { richTextField } from '../../fields/RichTextField';

export type { ProductGridHeaderProps };

export const createProductGridHeaderConfig = (
  intl: IntlShape
): ComponentConfig<ProductGridHeaderProps> => ({
  label: intl.formatMessage({ id: 'Editor.cfg.productGridHeader.label' }),
  fields: {
    title: { type: 'text', label: intl.formatMessage({ id: 'Editor.cfg.productGridHeader.field.title' }) },
    description: richTextField(intl.formatMessage({ id: 'Editor.cfg.productGridHeader.field.description' })),
  },
  defaultProps: { title: '', description: '' },
  render: renderProductGridHeader,
});
