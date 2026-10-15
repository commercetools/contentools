import { Router, type RequestHandler } from 'express';
import { createMediaRuntime } from '../media/runtime';
import { requireAuth } from '../middleware/auth.middleware';
import { configurationRouter } from './configuration.route';
import { configurationReadRouter } from './configuration-read.route';
import { contentTypeRouter } from './content-type.route';
import { datasourcePublicResolveRouter } from './datasource-public-resolve.route';
import { datasourceRouter } from './datasource.route';
import { healthRouter } from './health.route';
import { createMediaRouter } from './media.route';
import { productsRouter } from './products.route';
import { publishedContentsRouter, puckContentsRouter } from './puck-contents.route';
import { publishedPagesRouter, puckPagesRouter } from './puck-pages.route';
import { puckTemplatesRouter } from './puck-templates.route';

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
serviceRouter.use('/', lazyMediaRouter());

export default serviceRouter;
