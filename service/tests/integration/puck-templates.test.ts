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

const base = '/service/default/puck-templates';
const create = async (value: Record<string, unknown>, bu = 'default') =>
  t.http.post(`/service/${bu}/puck-templates`).set(t.auth).send({ value });

describe('templates', () => {
  it('creates with defaults', async () => {
    const res = await create({ name: 'T', kind: 'page' });
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^puck-template-/);
    expect(res.body.value.puckData).toEqual({ content: [], root: { props: {} } });
  });

  it('validates the body', async () => {
    const kind = await create({ name: 'T', kind: 'x' });
    expect(kind.status).toBe(400);
    expect(kind.body.message).toBe('kind must be "page" or "content"');
    const name = await create({ kind: 'page' });
    expect(name.body.message).toBe('name is required');
    const none = await t.http.post(base).set(t.auth).send({});
    expect(none.body.message).toBe('value is required in request body');
  });

  it('filters by kind and ignores an invalid kind', async () => {
    await create({ name: 'P', kind: 'page' });
    await create({ name: 'C', kind: 'content' });
    const names = async (q: string) =>
      (await t.http.get(`${base}${q}`).set(t.auth)).body.map((o: { value: { name: string } }) => o.value.name).sort();
    expect(await names('?kind=page')).toEqual(['P']);
    expect(await names('?kind=content')).toEqual(['C']);
    expect(await names('?kind=bogus')).toEqual(['C', 'P']);
  });

  it('lists all of 45 templates', async () => {
    for (let i = 0; i < 45; i += 1) await create({ name: `T${i}`, kind: 'page' });
    expect((await t.http.get(base).set(t.auth)).body).toHaveLength(45);
  });

  it('isolates business units on get and delete', async () => {
    const key = (await create({ name: 'T', kind: 'page' }, 'b2b-eu')).body.key;
    expect((await t.http.get(`${base}/${key}`).set(t.auth)).status).toBe(404);
    expect((await t.http.delete(`${base}/${key}`).set(t.auth)).status).toBe(404);
    expect((await t.http.get(`/service/b2b-eu/puck-templates/${key}`).set(t.auth)).status).toBe(200);
  });

  it('deletes: 204 then 404', async () => {
    const key = (await create({ name: 'T', kind: 'page' })).body.key;
    expect((await t.http.delete(`${base}/${key}`).set(t.auth)).status).toBe(204);
    expect((await t.http.delete(`${base}/${key}`).set(t.auth)).status).toBe(404);
  });

  it('requires a credential on every route', async () => {
    expect((await t.http.get(base)).status).toBe(401);
    expect((await t.http.get(`${base}/k`)).status).toBe(401);
    expect((await t.http.post(base).send({ value: { name: 'T', kind: 'page' } })).status).toBe(401);
    expect((await t.http.delete(`${base}/k`)).status).toBe(401);
  });
});
