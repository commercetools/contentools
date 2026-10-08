/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { configurationRouter } from './configuration.route';
import { configurationReadRouter } from './configuration-read.route';
import { contentTypeRouter } from './content-type.route';
import { datasourcePublicResolveRouter } from './datasource-public-resolve.route';
import { datasourceRouter } from './datasource.route';
import { healthRouter } from './health.route';
import { productsRouter } from './products.route';
import { publishedContentsRouter, puckContentsRouter } from './puck-contents.route';
import { publishedPagesRouter, puckPagesRouter } from './puck-pages.route';
import { puckTemplatesRouter } from './puck-templates.route';

const serviceRouter = Router();

// 1. PUBLIC: Authorization is ignored. Only routes marked PUBLIC in the access table of the auth design.
serviceRouter.use(healthRouter);
serviceRouter.use(
  publishedPagesRouter,
  publishedContentsRouter,
  configurationReadRouter,
  datasourcePublicResolveRouter
);

// 2. THE GATE: everything registered below requires a valid credential.
serviceRouter.use(requireAuth);

// 3. PROTECTED: mount all other routers here.
serviceRouter.use(
  puckPagesRouter,
  puckContentsRouter,
  puckTemplatesRouter,
  configurationRouter,
  datasourceRouter,
  productsRouter,
  contentTypeRouter
);

export default serviceRouter;
