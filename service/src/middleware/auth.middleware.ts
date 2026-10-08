/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { RequestHandler } from 'express';
import { createAuthenticator } from '../auth/authenticate';
import { getConfiguration } from '../config/env';

let authenticate: ReturnType<typeof createAuthenticator> | undefined;

export const resetAuthenticatorForTests = (): void => {
  authenticate = undefined;
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    authenticate ??= createAuthenticator(getConfiguration());
    req.principal = await authenticate(req);
    next();
  } catch (error) {
    next(error);
  }
};
