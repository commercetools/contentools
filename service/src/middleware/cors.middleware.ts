import cors from 'cors';
import type { RequestHandler } from 'express';
import type { Configuration } from '../config/env';

export function createCorsMiddleware(
  origins: Configuration['auth']['corsOrigins']
): RequestHandler {
  const allowed = origins === 'all' ? undefined : new Set(origins);
  return cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowed === undefined || allowed.has(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Source',
    ],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 600,
    credentials: false,
  });
}
