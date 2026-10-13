/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Express } from 'express';
import supertest from 'supertest';
import { createApp } from '../../src/app';
import { resetConfigurationForTests } from '../../src/config/env';
import { resetApiRootForTests } from '../../src/ct/client';
import { resetAuthenticatorForTests } from '../../src/middleware/auth.middleware';
import { resetPublicResolveForTests } from '../../src/middleware/public-resolve.middleware';
import { resetLoggerForTests } from '../../src/utils/logger.utils';
import * as fake from './fake-ct';
import { server } from './msw-setup';

/**
 * Fresh app over the shared msw server and the shared fake commercetools
 * (both are reset after every test by msw-setup). Call at the start of a test
 * or in `beforeEach`; set environment overrides BEFORE calling it.
 */
export function setupApiTest() {
  resetConfigurationForTests();
  resetApiRootForTests();
  resetAuthenticatorForTests();
  resetPublicResolveForTests();
  resetLoggerForTests();
  const app: Express = createApp();
  return {
    app,
    http: supertest(app),
    server,
    fake,
    auth: { Authorization: `Bearer ${process.env.SERVICE_API_TOKEN ?? ''}` },
  };
}

export type ApiTest = ReturnType<typeof setupApiTest>;
