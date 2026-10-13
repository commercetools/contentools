/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import CustomError from '../errors/custom.error';
import { currentCorrelationId } from '../observability/request-context';
import { getLogger } from '../utils/logger.utils';

export interface NormalizedError {
  status: number;
  message: string;
  code?: string;
  errors?: CustomError['errors'];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function normalize(error: unknown): NormalizedError {
  if (error instanceof CustomError) {
    const status = Number(error.statusCode);
    return {
      status:
        Number.isInteger(status) && status >= 400 && status <= 599
          ? status
          : 500,
      message: error.message,
      ...(error.code && { code: error.code }),
      ...(error.errors && { errors: error.errors }),
    };
  }
  if (isObject(error)) {
    if (error.type === 'entity.parse.failed') {
      return { status: 400, message: 'Invalid JSON body' };
    }
    if (error.type === 'entity.too.large') {
      return { status: 413, message: 'Payload too large' };
    }
    const status = error.status;
    if (
      typeof status === 'number' &&
      status >= 400 &&
      status <= 499 &&
      error.expose === true &&
      typeof error.message === 'string'
    ) {
      return { status, message: error.message };
    }
  }
  return { status: 500, message: 'Internal server error' };
}

export function describe(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'NonError', message: 'Non-error value thrown' };
}

export const notFoundMiddleware: RequestHandler = (_req, _res, next) =>
  next(new CustomError(404, 'Path not found.'));

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const dev = process.env.NODE_ENV === 'development';
  const { status, message, code, errors } = normalize(error);
  if (error instanceof CustomError && error.headers) {
    for (const [name, value] of Object.entries(error.headers)) {
      res.setHeader(name, value);
    }
  }
  if (status >= 500) {
    getLogger().error('request failed', { status, err: describe(error) });
  } else {
    getLogger().warn('request rejected', { status, message });
  }
  res.status(status).json({
    message,
    statusCode: status,
    correlationId: currentCorrelationId(),
    ...(code && { code }),
    ...(errors && { errors }),
    ...(dev && error instanceof Error && { stack: error.stack }),
  });
};
