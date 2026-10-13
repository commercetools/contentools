/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import express from 'express';
import request from 'supertest';
import CustomError from '../../src/errors/custom.error';
import { errorMiddleware } from '../../src/middleware/error.middleware';

describe('CustomError headers and code', () => {
  const app = express();
  app.get('/x', () => {
    throw new CustomError(401, 'x', undefined, {
      headers: { 'WWW-Authenticate': 'Bearer realm="contentools"' },
      code: 'SOME_CODE',
    });
  });
  app.get('/legacy', () => {
    throw new CustomError(409, 'y', undefined, 'LEGACY_CODE');
  });
  app.use(errorMiddleware);

  it('sets the response headers and body code', async () => {
    const res = await request(app).get('/x');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer realm="contentools"');
    expect(res.body.code).toBe('SOME_CODE');
  });

  it('still accepts a plain string code as 4th argument', async () => {
    const res = await request(app).get('/legacy');
    expect(res.body.code).toBe('LEGACY_CODE');
    expect(res.headers['www-authenticate']).toBeUndefined();
  });
});
