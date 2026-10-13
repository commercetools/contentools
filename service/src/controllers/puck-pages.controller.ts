/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { PageCreate, PageUpdate } from '../schemas/pages';
import { resolvePuckData } from '../services/datasource-resolution';
import { createItemStore } from '../services/item-store';
import type { PuckPageValue } from '../types/content';

export const pageStore = createItemStore<PuckPageValue, PageCreate, PageUpdate>({
  keyPrefix: 'puck-page-',
  containers: {
    item: 'puckPage',
    state: 'puckPageState',
    version: 'puckPageVersion',
  },
  queryFields: ['slug', 'name', 'key'],
  build: (businessUnitKey, key, input) => {
    const now = new Date().toISOString();
    return {
      key,
      businessUnitKey,
      name: input.name,
      slug: input.slug,
      puckData: input.puckData ?? { content: [], root: { props: {} } },
      ...(input.meta && { meta: input.meta }),
      createdAt: now,
      updatedAt: now,
    };
  },
  applyUpdate: (existing, input) => ({
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.puckData !== undefined && { puckData: input.puckData }),
    ...(input.meta !== undefined && { meta: input.meta }),
    updatedAt: new Date().toISOString(),
  }),
  resolveRead: async (value) => ({
    ...value,
    puckData: await resolvePuckData(value.puckData),
  }),
});
