/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import { importDefaultContentTypes } from '../controllers/content-type-import.controller';
import { validateKeyParams, wrap } from './params';

/** PROTECTED: mount after the auth gate. Content types are global; both paths run the same handler. */
export const contentTypeRouter = Router();
validateKeyParams(contentTypeRouter);

const handler = wrap(async (_req, res) => {
  res.status(200).json(await importDefaultContentTypes());
});

contentTypeRouter.post('/:businessUnitKey/content-type/import', handler);
contentTypeRouter.post('/content-type/import', handler);
