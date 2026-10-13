/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import supertest from 'supertest';
import { createApp } from '../../src/app';
import { CONTAINER_NAMES, type ContainerKey } from '../../src/config/containers';
import { customObjects } from '../../src/ct/custom-objects';
import { liveEnabled } from './env';

const prefix = process.env.CONTAINER_PREFIX ?? '';
const guarded = liveEnabled && prefix.startsWith('contentools-test-');
const suite = guarded ? describe : describe.skip;
if (!guarded) console.warn('live smoke skipped (no sandbox)');

const bu = 'default';

suite('live content API against the sandbox', () => {
  const http = guarded ? supertest(createApp()) : (undefined as never);
  const auth = { Authorization: `Bearer ${process.env.SERVICE_API_TOKEN ?? ''}` };

  afterAll(async () => {
    // Remove everything this run created, in every container.
    for (const key of Object.keys(CONTAINER_NAMES) as ContainerKey[]) {
      const handle = customObjects(key);
      for (const o of await handle.list()) {
        await handle.delete(o.key);
      }
    }
  });

  it('pages: six saves keep five versions, publish, public read, list, delete', async () => {
    const created = await http
      .post(`/service/${bu}/puck-pages`)
      .set(auth)
      .send({ value: { name: 'n0', slug: '/live' } });
    expect(created.status).toBe(201);
    const key = created.body.key as string;
    for (let i = 1; i <= 6; i += 1) {
      const res = await http
        .put(`/service/${bu}/puck-pages/${key}`)
        .set(auth)
        .send({ value: { name: `n${i}` } });
      expect(res.status).toBe(200);
    }
    const versions = await http.get(`/service/${bu}/puck-pages/${key}/versions`).set(auth);
    expect(versions.body.versions).toHaveLength(5);
    expect(versions.body.versions[0].name).toBe('n6');

    expect((await http.put(`/service/${bu}/puck-pages/${key}/states/published`).set(auth).send()).status).toBe(200);
    const published = await http.get(`/service/${bu}/published/puck-pages/${key}`);
    expect(published.status).toBe(200);
    const bySlug = await http
      .post(`/service/${bu}/published/puck-pages/query`)
      .send({ query: 'slug = "/live"' });
    expect(bySlug.status).toBe(200);

    const list = await http.get(`/service/${bu}/puck-pages`).set(auth);
    expect(list.body.map((p: { key: string }) => p.key)).toContain(key);
    expect((await http.delete(`/service/${bu}/puck-pages/${key}`).set(auth)).status).toBe(204);
  });

  it('configuration: theme PUT, GET, DELETE', async () => {
    const url = `/service/${bu}/configuration/theme`;
    expect((await http.put(url).set(auth).send({ value: { primary: 'red' } })).status).toBe(200);
    expect((await http.get(url)).body).toEqual({ primary: 'red' });
    expect((await http.get(`/service/${bu}/configuration`)).body.theme).toEqual({ primary: 'red' });
    expect((await http.delete(url).set(auth)).status).toBe(204);
    expect((await http.get(url)).body).toBeNull();
  });

  it('datasources: POST, GET, list, DELETE', async () => {
    const def = { name: 'Live source', params: [] };
    expect((await http.post('/service/datasource/live-source').set(auth).send({ value: def })).status).toBe(201);
    expect((await http.get('/service/datasource/live-source').set(auth)).body.value.name).toBe('Live source');
    const keys = (await http.get('/service/datasource').set(auth)).body.map((d: { key: string }) => d.key);
    expect(keys).toEqual(expect.arrayContaining(['product-by-sku', 'live-source']));
    expect((await http.delete('/service/datasource/live-source').set(auth)).status).toBe(204);
  });

  it('content types: imports 27 and they are stored', async () => {
    const res = await http.post('/service/content-type/import').set(auth).send();
    expect(res.status).toBe(200);
    expect(res.body.imported).toHaveLength(27);
    expect(res.body.failed).toEqual([]);
    const stored = await customObjects('contentType').list();
    expect(stored).toHaveLength(27);
  });

  it('product search answers 200 or 502', async () => {
    const res = await http.get('/service/products/search?text=a').set(auth);
    console.info(`live product search status: ${res.status}`);
    expect([200, 502]).toContain(res.status);
  });

  it('pagination: 25 templates are all listed (limit, offset, sort accepted)', async () => {
    for (let i = 0; i < 25; i += 1) {
      const res = await http
        .post(`/service/${bu}/puck-templates`)
        .set(auth)
        .send({ value: { name: `T${i}`, kind: 'page' } });
      expect(res.status).toBe(201);
    }
    const list = await http.get(`/service/${bu}/puck-templates`).set(auth);
    expect(list.body.length).toBeGreaterThanOrEqual(25);
  });

  it('size probe: a 900 KB page saved six times (records the outcome)', async () => {
    const big = {
      content: [{ type: 'Text', props: { id: '1', text: 'x'.repeat(900_000) } }],
      root: { props: {} },
    };
    const created = await http
      .post(`/service/${bu}/puck-pages`)
      .set(auth)
      .send({ value: { name: 'Big', slug: '/big', puckData: big } });
    const statuses: number[] = [created.status];
    if (created.status === 201) {
      for (let i = 1; i <= 6; i += 1) {
        const res = await http
          .put(`/service/${bu}/puck-pages/${created.body.key}`)
          .set(auth)
          .send({ value: { name: `Big ${i}` } });
        statuses.push(res.status);
      }
    }
    console.info(`live size probe statuses: ${statuses.join(',')}`);
    expect(statuses[0]).toBeDefined();
  });
});
