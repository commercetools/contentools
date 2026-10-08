/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router, type RequestHandler } from 'express';
import { createMediaRuntime } from '../media/runtime';
import { requireAuth } from '../middleware/auth.middleware';
import { healthRouter } from './health.route';
import { createMediaRouter } from './media.route';

const serviceRouter = Router();

/** Builds the media router on the first request, so importing this module never reads media configuration. */
function lazyMediaRouter(): RequestHandler {
  let router: Router | undefined;
  return (req, res, next) => {
    try {
      if (!router) {
        const runtime = createMediaRuntime(process.env);
        router = createMediaRouter({
          service: runtime.service,
          limits: { maxUploadBytes: runtime.config.maxUploadBytes },
          allowedMimeTypes: runtime.config.allowedMimeTypes,
        });
      }
      router(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

// 1. PUBLIC: Authorization is ignored. Only routes marked PUBLIC in the access table of the auth design.
serviceRouter.use(healthRouter);

// 2. THE GATE: everything registered below requires a valid credential.
serviceRouter.use(requireAuth);

// 3. PROTECTED: mount all other routers here.
serviceRouter.use('/', lazyMediaRouter());

export default serviceRouter;
