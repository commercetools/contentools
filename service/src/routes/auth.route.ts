/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import {
  authenticateProject,
  health,
  refreshJwt,
} from '../controllers/auth.controller';
import { validateJwtIgnoreExpiry } from '../middleware/jwt.middleware';
import { requireProjectKey } from '../middleware/project-key.middleware';

const authRouter: Router = Router();

authRouter.post('/authenticate-project', authenticateProject);

authRouter.post('/refresh-jwt', validateJwtIgnoreExpiry, refreshJwt);

authRouter.get('/health', requireProjectKey, health);

export default authRouter;
