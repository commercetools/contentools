/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
const saved = process.env.PUBLIC_DATASOURCE_RESOLVE;
const setup = (publicResolve?: string) => {
  if (publicResolve === undefined) delete process.env.PUBLIC_DATASOURCE_RESOLVE;
  else process.env.PUBLIC_DATASOURCE_RESOLVE = publicResolve;
  t = setupApiTest();
};
beforeEach(() => setup());
afterAll(() => {
  if (saved === undefined) delete process.env.PUBLIC_DATASOURCE_RESOLVE;
  else process.env.PUBLIC_DATASOURCE_RESOLVE = saved;
});

const def = { name: 'My source', params: [{ key: 'q', type: 'string' }], extra: 1 };
const post = (key: string, value: unknown = def) =>
  t.http.post(`/service/datasource/${key}`).set(t.auth).send({ value });

describe('datasource definitions', () => {
  it('lists exactly the built-ins on an empty project', async () => {
    const res = await t.http.get('/service/datasource').set(t.auth);
    expect(res.status).toBe(200);
    expect(res.body.map((d: { key: string }) => d.key)).toEqual(['product-by-sku', 'products-by-sku']);
    expect(res.body.every((d: { value: { builtIn: boolean } }) => d.value.builtIn === true)).toBe(true);
  });

  it('creates once; a duplicate or a built-in key is 409', async () => {
    const created = await post('mine');
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ key: 'mine', value: def });
    const dup = await post('mine');
    expect(dup.status).toBe(409);
    expect(dup.body.message).toBe("Datasource 'mine' already exists");
    expect((await post('product-by-sku')).status).toBe(409);
  });

  it('PUT upserts and refuses built-ins', async () => {
    const first = await t.http.put('/service/datasource/mine').set(t.auth).send({ value: def });
    expect(first.status).toBe(200);
    const second = await t.http
      .put('/service/datasource/mine')
      .set(t.auth)
      .send({ value: { ...def, name: 'Renamed' } });
    expect(second.body.value.name).toBe('Renamed');
    expect((await t.http.put('/service/datasource/products-by-sku').set(t.auth).send({ value: def })).status).toBe(409);
    expect(
      [...t.fake.store.objects.values()].filter((o) => o.container === 'datasource')
    ).toHaveLength(1);
  });

  it('gets stored, built-in and unknown keys', async () => {
    await post('mine');
    expect((await t.http.get('/service/datasource/mine').set(t.auth)).body.value.name).toBe('My source');
    expect((await t.http.get('/service/datasource/product-by-sku').set(t.auth)).body.value.builtIn).toBe(true);
    const missing = await t.http.get('/service/datasource/nope').set(t.auth);
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Datasource 'nope' not found");
  });

  it('deletes idempotently and refuses built-ins', async () => {
    await post('mine');
    expect((await t.http.delete('/service/datasource/mine').set(t.auth)).status).toBe(204);
    expect((await t.http.delete('/service/datasource/mine').set(t.auth)).status).toBe(204);
    expect((await t.http.delete('/service/datasource/product-by-sku').set(t.auth)).status).toBe(409);
  });

  it('validates the body and the key', async () => {
    expect((await t.http.post('/service/datasource/x').set(t.auth).send({})).status).toBe(400);
    expect((await post('x', { nope: true })).status).toBe(400);
    const hostile = await t.http.post('/service/datasource/a%2Fb').set(t.auth).send({ value: def });
    expect(hostile.status).toBe(400);
    expect(hostile.body.message).toBe('Invalid key');
  });
});

describe('POST /datasource/:key/test', () => {
  const test = (key: string, body: unknown) =>
    t.http.post(`/service/datasource/${key}/test`).set(t.auth).send(body as object);

  it('resolves the built-ins', async () => {
    const projection = { id: 'p1', masterVariant: { id: 1, sku: 'S1' } };
    t.fake.productSearch.respondWith(() => [{ id: 'p1', productProjection: projection }]);
    const one = await test('product-by-sku', { params: { sku: 'S1' } });
    expect(one.status).toBe(200);
    expect(one.body).toEqual(projection);
    const many = await test('products-by-sku', { params: { skus: 'S1,S2' } });
    expect(many.body).toEqual([projection, projection]);
  });

  it('rejects more than 25 SKUs', async () => {
    const skus = Array.from({ length: 26 }, (_, i) => `S${i}`).join(',');
    const res = await test('products-by-sku', { params: { skus } });
    expect(res.status).toBe(400);
  });

  it('answers 501 for a stored custom key and 404 for an unknown one', async () => {
    await post('mine');
    expect((await test('mine', { params: {} })).status).toBe(501);
    expect((await test('nope', { params: {} })).status).toBe(404);
  });

  it('shows resolver failures instead of hiding them', async () => {
    t.fake.productSearch.failWith(400);
    expect((await test('product-by-sku', { params: { sku: 'S1' } })).status).toBe(502);
  });
});

describe('access', () => {
  it('requires a credential on every route', async () => {
    const calls = [
      t.http.get('/service/datasource'),
      t.http.get('/service/datasource/mine'),
      t.http.post('/service/datasource/mine').send({ value: def }),
      t.http.put('/service/datasource/mine').send({ value: def }),
      t.http.delete('/service/datasource/mine'),
      t.http.post('/service/datasource/mine/test').send({}),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
  });

  it('opens built-in resolve anonymously only when the flag is on', async () => {
    const anon = (key: string) => t.http.post(`/service/datasource/${key}/test`).send({ params: { sku: 'S1' } });
    expect((await anon('product-by-sku')).status).toBe(401);
    setup('true');
    t.fake.productSearch.respondWith(() => []);
    expect((await anon('product-by-sku')).status).toBe(200);
    expect((await anon('mine')).status).toBe(401);
    expect((await t.http.get('/service/datasource')).status).toBe(401);
  });
});
