/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const handler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'UP',
    service: 'contentools-service',
    timestamp: new Date().toISOString(),
  });
};

export const healthRouter = Router();
healthRouter.get('/health', handler);
healthRouter.get('/status', handler);
