/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Request, RequestHandler, Response, Router } from 'express';
import { assertSafeKey } from '../utils/predicate';

/** Rejects hostile path parameters before any handler (or commercetools predicate) sees them. Call it for every router. */
export function validateKeyParams(router: Router): void {
  router.param('businessUnitKey', (_req, _res, next, value: string) => {
    try {
      assertSafeKey(value, 'businessUnitKey');
      next();
    } catch (error) {
      next(error);
    }
  });
  router.param('key', (_req, _res, next, value: string) => {
    try {
      assertSafeKey(value, 'key');
      next();
    } catch (error) {
      next(error);
    }
  });
}

/** Express 4 does not catch rejected promises: forward them to the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/** Path parameters are plain strings; this narrows the Express typing. */
export const param = (req: Request, name: string): string =>
  String(req.params[name] ?? '');
