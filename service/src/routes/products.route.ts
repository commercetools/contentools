/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Router } from 'express';
import { searchProductsController } from '../controllers/products.controller';
import { wrap } from './params';

/** PROTECTED: mount after the auth gate. */
export const productsRouter = Router();

productsRouter.get(
  '/products/search',
  wrap(async (req, res) => {
    const text = String(req.query.text ?? req.query.q ?? '');
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const locale = String(req.query.locale ?? 'en-US');
    res.json(await searchProductsController(text, limit, locale));
  })
);
