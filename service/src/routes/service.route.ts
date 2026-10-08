/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { healthRouter } from './health.route';

const serviceRouter = Router();

// 1. PUBLIC: Authorization is ignored. Only routes marked PUBLIC in the access table of the auth design.
serviceRouter.use(healthRouter);

// 2. THE GATE: everything registered below requires a valid credential.
serviceRouter.use(requireAuth);

// 3. PROTECTED: mount all other routers here.

export default serviceRouter;
