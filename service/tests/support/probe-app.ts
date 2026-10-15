import express, { Router, type Express } from 'express';
import { Writable } from 'node:stream';
import { transports } from 'winston';
import {
  getConfiguration,
  resetConfigurationForTests,
} from '../../src/config/env';
import {
  requireAuth,
  resetAuthenticatorForTests,
} from '../../src/middleware/auth.middleware';
import { createCorsMiddleware } from '../../src/middleware/cors.middleware';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '../../src/middleware/error.middleware';
import {
  publicResolveGuard,
  resetPublicResolveForTests,
} from '../../src/middleware/public-resolve.middleware';
import { accessLog } from '../../src/observability/access-log';
import { requestContext } from '../../src/observability/request-context';
import { healthRouter } from '../../src/routes/health.route';
import { getLogger, resetLoggerForTests } from '../../src/utils/logger.utils';

/** Minimal app mirroring the router layout of service.route.ts: public routes, the gate, protected routes. */
export function createProbeApp(): Express {
  resetConfigurationForTests();
  resetAuthenticatorForTests();
  resetPublicResolveForTests();
  resetLoggerForTests();
  const config = getConfiguration();
  const app = express();
  app.use(
    requestContext,
    accessLog,
    createCorsMiddleware(config.auth.corsOrigins),
    express.json()
  );
  const router = Router();
  router.use(healthRouter);
  router.get('/public-probe', (_req, res) => {
    res.json({ access: 'public' });
  });
  router.post('/datasource/:key/test', publicResolveGuard, (req, res) => {
    res.json({ access: 'public-resolve', key: req.params.key });
  });
  router.use(requireAuth);
  router.get('/protected-probe', (req, res) => {
    res.json({ principal: req.principal });
  });
  router.post('/protected-probe', (req, res) => {
    res.status(201).json({ principal: req.principal });
  });
  router.post('/datasource/:key/test', (_req, res) => {
    res.json({ access: 'protected' });
  });
  router.get('/datasource', (_req, res) => {
    res.json({ access: 'protected' });
  });
  router.get('/products/search', (_req, res) => {
    res.json({ access: 'protected' });
  });
  app.use('/service', router);
  app.use(notFoundMiddleware, errorMiddleware);
  return app;
}

/** Captures everything the service logs (any level the configuration allows). Call `stop()` when done. */
export function captureLogs(): { text: () => string; stop: () => void } {
  const chunks: string[] = [];
  const sink = new transports.Stream({
    stream: new Writable({
      write(chunk, _enc, done) {
        chunks.push(String(chunk));
        done();
      },
    }),
  });
  const logger = getLogger();
  logger.add(sink);
  return {
    text: () => chunks.join(''),
    stop: () => {
      logger.remove(sink);
    },
  };
}
