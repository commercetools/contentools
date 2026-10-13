/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { type ComponentConfig } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import { renderProductTeaser, type ProductTeaserProps } from '@commercetools-labs/contentools-components';
import { DatasourceField } from '../fields/DatasourceField';
import { richTextField } from '../fields/RichTextField';
import { productLinkDefaults, createProductLinkFields } from './blocks/shared';

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
