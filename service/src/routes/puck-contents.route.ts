/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { contentStore } from '../controllers/puck-contents.controller';
import { contentCreate, contentUpdate } from '../schemas/contents';
import { buildItemRouters } from './item-routes';

const { publicRouter, protectedRouter } = buildItemRouters({
  path: 'puck-contents',
  store: contentStore,
  createSchema: contentCreate,
  updateSchema: contentUpdate,
  listFilter: (req) => ({
    contentType:
      typeof req.query.contentType === 'string'
        ? req.query.contentType
        : undefined,
  }),
  messages: {
    publishedNotFound: 'Published puck content not found',
    previewNotFound: 'Puck content not found',
  },
});

export const publishedContentsRouter = publicRouter;
export const puckContentsRouter = protectedRouter;
