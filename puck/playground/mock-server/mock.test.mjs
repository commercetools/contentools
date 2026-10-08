/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Contract tests for the mock service. They use the BUILT puck-api (run `yarn build` first), so the
// mock cannot drift from the client: the protected routes are compared with PUCK_AUTH_POLICY.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { http, passthrough } from 'msw';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { server as msw } from '../../vitest.setup';
import { PROTECTED_OPS, createMockServer } from './index.mjs';

const distPath = resolve(import.meta.dirname, '../../packages/puck-api/dist/index.mjs');
const built = existsSync(distPath);
if (!built) {
  console.warn(`mock-server tests skipped: ${distPath} is missing, run "yarn build" in puck/ first`);
}
const api = built ? await import(distPath) : null;

describe.skipIf(!built)('mock service', () => {
  let mock;
  let client;
  let anonymous;

  beforeAll(async () => {
    mock = await createMockServer({ token: 'dev-token', mediaMax: 4 });
    client = api.createPuckClient({ baseURL: mock.url, businessUnitKey: 'main-store', jwtToken: 'dev-token' });
    anonymous = api.createPuckClient({ baseURL: mock.url, businessUnitKey: 'main-store', fetcher: (r) => fetch(r.url, r) });
  });

  afterAll(async () => {
    await mock.close();
  });

  beforeEach(async () => {
    // handlers are reset after every test by the shared setup
    msw.use(http.all(/^http:\/\/localhost:\d+\//, () => passthrough()));
    await fetch(`${mock.url}/__reset`, { method: 'POST' });
  });

  it('protects exactly the operations that the client policy marks protected', () => {
    const policy = api.PUCK_AUTH_POLICY;
    const protectedByPolicy = Object.keys(policy).filter((op) => policy[op] === 'protected');
    expect([...PROTECTED_OPS].sort()).toEqual(protectedByPolicy.sort());
    // the two function-valued entries are the query calls, the attach entry the datasource resolve
    expect(Object.keys(policy).filter((op) => typeof policy[op] === 'function').sort()).toEqual([
      'queryPuckContentApi',
      'queryPuckPageApi',
    ]);
    expect(Object.keys(policy).filter((op) => policy[op] === 'attach')).toEqual(['resolveDatasourceApi']);
  });

  it('answers a CORS preflight with 204 and the three allowed headers', async () => {
    const res = await fetch(`${mock.url}/main-store/puck-pages`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5174');
    expect(res.headers.get('access-control-allow-headers')).toBe('Content-Type, Authorization, x-source');
    expect(res.headers.get('access-control-allow-methods')).toContain('PUT');
  });

  it('serves every one of the 35 client functions end to end', async () => {
    const calls = {};
    const run = (name, fn) => {
      calls[name] = fn;
    };
    const value = (name) => ({ name, slug: `/${name.toLowerCase()}` });

    run('listPuckPagesApi', () => api.listPuckPagesApi(client));
    run('getPuckPageApi', () => api.getPuckPageApi(client, 'home'));
    run('createPuckPageApi', () => api.createPuckPageApi(client, { value: value('Tmp Page') }));
    run('updatePuckPageApi', () => api.updatePuckPageApi(client, 'tmp-page', { value: { name: 'Tmp 2' } }));
    run('getPuckPageStatesApi', () => api.getPuckPageStatesApi(client, 'home'));
    run('publishPuckPageApi', () => api.publishPuckPageApi(client, 'tmp-page', true));
    run('getPuckPageVersionsApi', () => api.getPuckPageVersionsApi(client, 'home'));
    run('revertPuckPageDraftApi', () => api.revertPuckPageDraftApi(client, 'home'));
    run('getPublishedPuckPageApi', () => api.getPublishedPuckPageApi(client, 'home'));
    run('getPreviewPuckPageApi', () => api.getPreviewPuckPageApi(client, 'about'));
    run('queryPuckPageApi', () => api.queryPuckPageApi(client, { query: 'slug = "/about"' }, 'published'));
    run('deletePuckPageApi', () => api.deletePuckPageApi(client, 'tmp-page'));

    run('listPuckContentsApi', () => api.listPuckContentsApi(client, 'hero'));
    run('getPuckContentApi', () => api.getPuckContentApi(client, 'hero-banner'));
    run('createPuckContentApi', () => api.createPuckContentApi(client, { value: { name: 'Tmp Content', contentType: 'hero' } }));
    run('updatePuckContentApi', () => api.updatePuckContentApi(client, 'tmp-content', { value: { name: 'Tmp 2' } }));
    run('getPuckContentStatesApi', () => api.getPuckContentStatesApi(client, 'hero-banner'));
    run('publishPuckContentApi', () => api.publishPuckContentApi(client, 'tmp-content'));
    run('getPuckContentVersionsApi', () => api.getPuckContentVersionsApi(client, 'hero-banner'));
    run('revertPuckContentDraftApi', () => api.revertPuckContentDraftApi(client, 'tmp-content'));
    run('getPublishedPuckContentApi', () => api.getPublishedPuckContentApi(client, 'hero-banner'));
    run('getPreviewPuckContentApi', () => api.getPreviewPuckContentApi(client, 'hero-banner'));
    run('queryPuckContentApi', () => api.queryPuckContentApi(client, { query: 'contentType = "hero"' }, 'preview'));
    run('deletePuckContentApi', () => api.deletePuckContentApi(client, 'tmp-content'));

    run('listPuckTemplatesApi', () => api.listPuckTemplatesApi(client, 'page'));
    run('createPuckTemplateApi', () =>
      api.createPuckTemplateApi(client, { value: { name: 'Tmp Template', kind: 'page', puckData: { content: [], root: {} } } })
    );
    run('deletePuckTemplateApi', () => api.deletePuckTemplateApi(client, 'tmp-template'));

    run('getThemeApi', () => api.getThemeApi(client));
    run('createThemeApi', () => api.createThemeApi(client, { primaryColor: '#000' }));
    run('updateThemeApi', () => api.updateThemeApi(client, { primaryColor: '#111' }));
    run('importDefaultContentTypesApi', () => api.importDefaultContentTypesApi(client));
    run('fetchMediaLibraryApi', () => api.fetchMediaLibraryApi(client, { limit: 20 }));
    run('uploadMediaFileApi', () => api.uploadMediaFileApi(client, new File(['x'], 'a.png', { type: 'image/png' })));
    run('searchProductsApi', () => api.searchProductsApi(client, 'shoe'));
    run('resolveDatasourceApi', () => api.resolveDatasourceApi(client, 'product-by-sku', { params: { sku: 'SKU-1' } }));

    expect(Object.keys(calls).sort()).toEqual(Object.keys(api.PUCK_AUTH_POLICY).sort());
    for (const [name, call] of Object.entries(calls)) {
      await expect(call(), name).resolves.not.toThrow();
    }
  });

  it('answers 401 with the error envelope and WWW-Authenticate', async () => {
    const res = await fetch(`${mock.url}/main-store/puck-pages`);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer realm="contentools"');
    const body = await res.json();
    expect(body).toMatchObject({ message: 'Authentication required', statusCode: 401 });
    expect(typeof body.correlationId).toBe('string');
    await expect(
      api.createPuckClient({ baseURL: mock.url, businessUnitKey: 'main-store', jwtToken: 'wrong' }).request('listPuckPagesApi', '/main-store/puck-pages')
    ).rejects.toMatchObject({ name: 'PuckAuthError', authCode: 'PUCK_AUTH_REJECTED', status: 401 });
  });

  it('serves published reads anonymously with resolvedData embedded, preview only with auth', async () => {
    const published = await api.getPublishedPuckPageApi(anonymous, 'home');
    const banner = published.puckData.content.find((c) => c.type === 'ProductBanner');
    expect(banner.props.product.resolvedData.id).toBe('p1');
    expect(published.puckData.content[0].props.title).toBe('Welcome');

    const preview = await api.getPreviewPuckPageApi(client, 'home');
    expect(preview.puckData.content[0].props.title).toBe('Welcome (draft)');
    const res = await fetch(`${mock.url}/main-store/preview/puck-pages/home`);
    expect(res.status).toBe(401);
  });

  it('writes the draft on update and the published state on publish', async () => {
    const created = await api.createPuckPageApi(client, { value: { name: 'Fresh', slug: '/fresh' } });
    expect(created.key).toBe('fresh');
    await expect(api.getPublishedPuckPageApi(anonymous, 'fresh')).rejects.toMatchObject({ status: 404 });
    await api.publishPuckPageApi(client, 'fresh');
    await expect(api.getPublishedPuckPageApi(anonymous, 'fresh')).resolves.toMatchObject({ slug: '/fresh' });
    await expect(api.queryPuckPageApi(anonymous, { query: 'slug = "/nope"' }, 'published')).resolves.toBeNull();
  });

  it('pages the media library with cursors and answers 501 when media is off', async () => {
    const first = await api.fetchMediaLibraryApi(client, { limit: 20 });
    expect(first.files).toHaveLength(4);
    expect(first.pagination.hasMore).toBe(true);
    const second = await api.fetchMediaLibraryApi(client, { cursor: first.pagination.nextCursor });
    expect(second.files).toHaveLength(2);
    expect(second.pagination).toMatchObject({ hasMore: false, nextCursor: null });
    await expect(api.fetchMediaLibraryApi(client, { cursor: 'bogus' })).rejects.toMatchObject({
      status: 400,
      code: 'MEDIA_INVALID_CURSOR',
    });

    const off = await createMockServer({ media: 'none' });
    try {
      const offClient = api.createPuckClient({ baseURL: off.url, businessUnitKey: 'main-store', jwtToken: 'dev-token' });
      await expect(api.fetchMediaLibraryApi(offClient)).rejects.toMatchObject({ status: 501, code: 'MEDIA_NOT_CONFIGURED' });
    } finally {
      await off.close();
    }
  });

  it('keeps datasource resolve protected unless the public flag is set', async () => {
    await expect(api.resolveDatasourceApi(anonymous, 'product-by-sku', { params: { sku: 'S' } })).rejects.toMatchObject({ status: 401 });
    const open = await createMockServer({ publicDatasourceResolve: true });
    try {
      const openAnonymous = api.createPuckClient({ baseURL: open.url, businessUnitKey: 'main-store', fetcher: (r) => fetch(r.url, r) });
      await expect(api.resolveDatasourceApi(openAnonymous, 'product-by-sku', { params: { sku: 'S' } })).resolves.toMatchObject({ id: 'p1' });
      await expect(api.resolveDatasourceApi(openAnonymous, 'other-key', { params: {} })).rejects.toMatchObject({ status: 401 });
    } finally {
      await open.close();
    }
  });
});
