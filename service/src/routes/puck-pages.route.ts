/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { pageStore } from '../controllers/puck-pages.controller';
import { pageCreate, pageUpdate } from '../schemas/pages';
import { buildItemRouters } from './item-routes';

const { publicRouter, protectedRouter } = buildItemRouters({
  path: 'puck-pages',
  store: pageStore,
  createSchema: pageCreate,
  updateSchema: pageUpdate,
  messages: {
    publishedNotFound: 'Published puck page not found',
    previewNotFound: 'Puck page not found',
  },
});

export const publishedPagesRouter = publicRouter;
export const puckPagesRouter = protectedRouter;
