/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import request from 'supertest';
import { createProbeApp } from '../support/probe-app';

const saved = {
  PUBLIC_DATASOURCE_RESOLVE: process.env.PUBLIC_DATASOURCE_RESOLVE,
  PUBLIC_RESOLVE_MAX_PER_MINUTE: process.env.PUBLIC_RESOLVE_MAX_PER_MINUTE,
};

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const resolve = (key: string) => `/service/datasource/${key}/test`;

describe('flag off (default)', () => {
  it('requires authentication', async () => {
    delete process.env.PUBLIC_DATASOURCE_RESOLVE;
    const res = await request(createProbeApp())
      .post(resolve('product-by-sku'))
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('flag on', () => {
  beforeEach(() => {
    process.env.PUBLIC_DATASOURCE_RESOLVE = 'true';
  });

  it.each(['product-by-sku', 'products-by-sku'])(
    'serves built-in key %s anonymously',
    async (key) => {
      const res = await request(createProbeApp()).post(resolve(key)).send({});
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ access: 'public-resolve', key });
    }
  );

  it('ignores an invalid Authorization header on the public path', async () => {
    const res = await request(createProbeApp())
      .post(resolve('product-by-sku'))
      .set('Authorization', 'Bearer garbage')
      .send({});
    expect(res.status).toBe(200);
  });

  it('still protects other keys and other routes', async () => {
    const app = createProbeApp();
    expect(
      (await request(app).post(resolve('my-custom')).send({})).status
    ).toBe(401);
    expect((await request(app).get('/service/datasource')).status).toBe(401);
    expect((await request(app).get('/service/products/search')).status).toBe(
      401
    );
  });

  it('falls through to the protected handler for authenticated callers on other keys', async () => {
    const res = await request(createProbeApp())
      .post(resolve('my-custom'))
      .set('Authorization', `Bearer ${process.env.SERVICE_API_TOKEN}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ access: 'protected' });
  });

  it('limits anonymous calls per minute', async () => {
    process.env.PUBLIC_RESOLVE_MAX_PER_MINUTE = '2';
    const app = createProbeApp();
    expect(
      (await request(app).post(resolve('product-by-sku')).send({})).status
    ).toBe(200);
    expect(
      (await request(app).post(resolve('product-by-sku')).send({})).status
    ).toBe(200);
    const third = await request(app).post(resolve('product-by-sku')).send({});
    expect(third.status).toBe(429);
    expect(third.body.message).toBe('Too many requests');
    expect(Number(third.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });
});
