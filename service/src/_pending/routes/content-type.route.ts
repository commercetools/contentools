/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router, RequestHandler } from 'express';
import { logger } from '../utils/logger.utils';
import { importDefaultContentTypes } from '../controllers/content-type-import.controller';
import { validateJwt } from '../middleware/jwt.middleware';
import { validateProject } from '../middleware/project.middleware';

const contentTypeRouter = Router();

contentTypeRouter.post('/content-type/import', validateJwt, validateProject, (async (req, res, next) => {
  try {
    const result = await importDefaultContentTypes(req);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to import default content types:', error);
    next(error);
  }
}) as RequestHandler);

export default contentTypeRouter;
