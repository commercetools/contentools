/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { z } from 'zod';
import { defineTool } from '../types';

export const productsTools = [
  defineTool({
    name: 'search_products',
    title: 'Search products',
    group: 'products',
    access: 'read',
    description:
      'Full-text search of the commercetools product catalog (used to pick products for Puck components). Returns matching products; limit defaults to 20 (max 50), locale to en-US.',
    shape: {
      text: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(50).optional(),
      locale: z.string().min(2).max(20).optional(),
    },
    request: (i) => {
      const q = new URLSearchParams({ text: i.text });
      if (i.limit !== undefined) q.set('limit', String(i.limit));
      if (i.locale !== undefined) q.set('locale', i.locale);
      return { method: 'GET', path: `/products/search?${q.toString()}` };
    },
  }),
];
