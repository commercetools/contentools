import * as dotenv from 'dotenv';
dotenv.config();

import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Express } from 'express';

// Import routes
import ServiceRoutes from './routes/service.route';

import CustomError from './errors/custom.error';
import { errorMiddleware } from './middleware/error.middleware';
import { extractMainDomain } from './utils/domain';
import { logger } from './utils/logger.utils';
import { CORS_ALLOWED_ORIGINS } from './constants';

// Create the express app
const app: Express = express();
app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const domain = extractMainDomain(origin);
      logger.info(`Checking origin: ${origin} with domain: ${domain}`);
      if (CORS_ALLOWED_ORIGINS?.split(',').includes(domain)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-project-key', 'x-source'],
  })
);

// Define configurations
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Structured request/response logger — output goes to GCP Cloud Logging automatically
app.use((req, res, next) => {
  const start = Date.now();
  const source = (req.headers['x-source'] as string) ?? 'unknown';

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    console.log(JSON.stringify({
      source,
      method: req.method,
      url: req.url,
      payload: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      status: res.statusCode,
      result:  body || undefined,
      durationMs: Date.now() - start,
    }));
    return originalJson(body);
  };

  next();
});

// Define routes
app.use('/service', ServiceRoutes);
app.use('*', () => {
  throw new CustomError(404, 'Path not found.');
});
// Global error handler
app.use(errorMiddleware);

export default app;
