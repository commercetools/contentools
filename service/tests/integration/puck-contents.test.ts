/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest, type ApiTest } from '../support/api';

let t: ApiTest;
beforeEach(() => {
  t = setupApiTest();
});

const create = async (
  value: Record<string, unknown> = { name: 'Hero 1', contentType: 'hero' },
  bu = 'default'
) => {
  const res = await t.http.post(`/service/${bu}/puck-contents`).set(t.auth).send({ value });
  expect(res.status).toBe(201);
  return res.body.key as string;
};

describe('puck contents', () => {
  it('creates with defaults and validates required fields', async () => {
    const res = await t.http
      .post('/service/default/puck-contents')
      .set(t.auth)
      .send({ value: { name: 'A', contentType: 'hero' } });
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^puck-content-/);
    expect(res.body.value.data).toEqual({});
    const noType = await t.http
      .post('/service/default/puck-contents')
      .set(t.auth)
      .send({ value: { name: 'A' } });
    expect(noType.status).toBe(400);
    expect(noType.body.message).toBe('contentType is required');
    const noName = await t.http
      .post('/service/default/puck-contents')
      .set(t.auth)
      .send({ value: { contentType: 'hero' } });
    expect(noName.body.message).toBe('name is required');
  });

  it('filters the list by contentType', async () => {
    await create({ name: 'A', contentType: 'hero' });
    await create({ name: 'B', contentType: 'banner' });
    const all = await t.http.get('/service/default/puck-contents').set(t.auth);
    expect(all.body).toHaveLength(2);
    const hero = await t.http.get('/service/default/puck-contents?contentType=hero').set(t.auth);
    expect(hero.body.map((o: { value: { name: string } }) => o.value.name)).toEqual(['A']);
  });

  it('queries by contentType and serves published reads without datasource resolution', async () => {
    const key = await create({
      name: 'A',
      contentType: 'hero',
      data: { product: { type: 'product-by-sku', skus: ['S1'] } },
    });
    await t.http.put(`/service/default/puck-contents/${key}/states/published`).set(t.auth).send();
    const res = await t.http
      .post('/service/default/published/puck-contents/query')
      .send({ query: 'contentType = "hero"' });
    expect(res.status).toBe(200);
    expect(res.body.data.product.resolvedData).toBeUndefined();
    const read = await t.http.get(`/service/default/published/puck-contents/${key}`);
    expect(read.status).toBe(200);
    expect(t.fake.productSearch.calls).toHaveLength(0);
  });

  it('uses the documented not-found messages', async () => {
    const pub = await t.http.get('/service/default/published/puck-contents/nope');
    expect(pub.body.message).toBe('Published puck content not found');
    const prev = await t.http.get('/service/default/preview/puck-contents/nope').set(t.auth);
    expect(prev.body.message).toBe('Puck content not found');
  });

  it('isolates business units', async () => {
    const key = await create({ name: 'A', contentType: 'hero' }, 'b2b-eu');
    const other = await t.http.get('/service/b2c-us/puck-contents').set(t.auth);
    expect(other.body).toEqual([]);
    const read = await t.http.get(`/service/b2c-us/puck-contents/${key}`).set(t.auth);
    expect(read.status).toBe(404);
  });

  it('merges updates with the whitelist and deletes', async () => {
    const key = await create();
    const upd = await t.http
      .put(`/service/default/puck-contents/${key}`)
      .set(t.auth)
      .send({ value: { data: { a: 1 }, key: 'evil' } });
    expect(upd.body.value.data).toEqual({ a: 1 });
    expect(upd.body.value.key).toBe(key);
    expect((await t.http.delete(`/service/default/puck-contents/${key}`).set(t.auth)).status).toBe(204);
    expect((await t.http.delete(`/service/default/puck-contents/${key}`).set(t.auth)).status).toBe(404);
  });
});
