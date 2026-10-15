import express, { type Express } from 'express';
import { getConfiguration, type Configuration } from './config/env';
import { createCorsMiddleware } from './middleware/cors.middleware';
import {
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware';
import { accessLog } from './observability/access-log';
import { requestContext } from './observability/request-context';
import { SERVICE_MOUNT } from './routes/mount';
import serviceRouter from './routes/service.route';

export function createApp(config: Configuration = getConfiguration()): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(accessLog);
  app.use(createCorsMiddleware(config.auth.corsOrigins));
  app.use(express.json({ limit: '2mb' }));
  app.use(SERVICE_MOUNT, serviceRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
