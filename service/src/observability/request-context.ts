/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const store = new AsyncLocalStorage<{ correlationId: string }>();

const VALID_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export const currentCorrelationId = (): string | undefined =>
  store.getStore()?.correlationId;

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-correlation-id');
  const id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Correlation-ID', id);
  store.run({ correlationId: id }, next);
};
