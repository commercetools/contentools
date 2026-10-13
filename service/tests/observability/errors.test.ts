/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import express from 'express';
import request from 'supertest';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '../../src/middleware/error.middleware';
import { accessLog } from '../../src/observability/access-log';
import { requestContext } from '../../src/observability/request-context';
import { withLogs } from './support';

const app = (): express.Express => {
  const a = express();
  a.use(requestContext, accessLog);
  a.get('/service/boom', () => {
    throw new Error('secret path /srv/app/x.ts');
  });
  a.use(notFoundMiddleware, errorMiddleware);
  return a;
};

describe('error hygiene (production mode)', () => {
  const original = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('hides an unhandled error and logs it once with the correlation id', async () => {
    await withLogs('error', async (logs) => {
      const res = await request(app())
        .get('/service/boom')
        .set('X-Correlation-ID', 'err-12345678');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error');
      expect(JSON.stringify(res.body)).not.toContain('secret path');
      expect(res.body.stack).toBeUndefined();
      await new Promise((resolve) => setTimeout(resolve, 30));
      const errors = logs.records().filter((r) => r.level === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.correlationId).toBe('err-12345678');
    });
  });

  it('answers an unknown path with a JSON 404 and no stack', async () => {
    const res = await request(app()).get('/service/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.stack).toBeUndefined();
    expect(res.body.statusCode).toBe(404);
  });
});
