/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export default [
  {
    container: 'datasource',
    key: 'product-by-sku',
    value: {
      name: 'Get Product by SKU',
      key: 'product-by-sku',
      params: [
        {
          key: 'sku',
          type: 'string',
          required: true,
        },
      ],
    },
  },
  {
    container: 'datasource',
    key: 'products-by-sku',
    value: {
      name: 'Get Products by SKU',
      key: 'products-by-sku',
      params: [
        {
          key: 'skus',
          type: 'string',
          required: true,
        },
      ],
    },
  },
];
