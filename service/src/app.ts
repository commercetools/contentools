/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import express, { type Express } from 'express';
import { getConfiguration, type Configuration } from './config/env';
import { createCorsMiddleware } from './middleware/cors.middleware';
import {
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware';
import { accessLog } from './observability/access-log';
import { requestContext } from './observability/request-context';
import serviceRouter from './routes/service.route';

export function createApp(config: Configuration = getConfiguration()): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(accessLog);
  app.use(createCorsMiddleware(config.auth.corsOrigins));
  app.use(express.json({ limit: '2mb' }));
  app.use('/service', serviceRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
