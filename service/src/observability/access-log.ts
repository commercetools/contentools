/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { RequestHandler } from 'express';
import { getLogger } from '../utils/logger.utils';

export const accessLog: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route =
      typeof req.route?.path === 'string'
        ? `${req.baseUrl}${req.route.path}`
        : '<unmatched>';
    getLogger().info('request', {
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      source: req.get('x-source') ?? 'unknown',
    });
  });
  next();
};
