/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import { H, SERVICE_BASE, call, makeTestApp, onUnhandledRequest, rpc, toolText } from '../support/app';

interface Seen {
  method: string;
  url: string;
  body?: string;
}
const svc = setupServer();
let seen: Seen[] = [];
beforeAll(() => svc.listen({ onUnhandledRequest }));
beforeEach(() => {
  seen = [];
});
afterEach(() => svc.resetHandlers());
afterAll(() => svc.close());

const respond = (status: number, json: unknown) =>
  svc.use(
    http.all(`${SERVICE_BASE}/*`, async ({ request: r }) => {
      seen.push({ method: r.method, url: r.url, body: r.method === 'GET' ? undefined : await r.text() });
      return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(json as never, { status });
    })
  );

const names = async (app: ReturnType<typeof makeTestApp>) =>
  ((await request(app).post('/mcp').set(H).send(rpc('tools/list'))).body.result.tools as Array<{ name: string }>).map(
    (t) => t.name
  );

test('writes off lists exactly the 24 read tools', async () => {
  const list = await names(makeTestApp());
  expect(list).toHaveLength(24);
  expect(list).not.toContain('create_puck_page');
});

test('writes on lists 44 tools', async () => {
  expect(await names(makeTestApp({ writes: true }))).toHaveLength(44);
});

test('groups pages,products read-only list 9', async () => {
  expect(await names(makeTestApp({ groups: 'pages,products' }))).toHaveLength(9);
});

test('a write tool is unknown when writes are disabled and nothing is called', async () => {
  respond(200, {});
  const r = await call(makeTestApp(), 'delete_puck_page', { key: 'home' });
  const failed = r.body.error !== undefined || r.body.result?.isError === true;
  expect(failed).toBe(true);
  expect(seen).toHaveLength(0);
});

test('representative tools produce the expected outbound requests', async () => {
  const app = makeTestApp({ writes: true });
  respond(200, { ok: true });

  await call(app, 'get_puck_page', { key: 'a/b' });
  await call(app, 'search_products', { text: 'red shirt', limit: 5 });
  await call(app, 'get_configuration', { slice: 'theme' });
  await call(app, 'list_datasources');
  await call(app, 'create_puck_page', { value: { name: 'N', slug: '/n' } });
  await call(app, 'import_default_content_types');

  expect(seen.map((s) => `${s.method} ${new URL(s.url).pathname}${new URL(s.url).search}`)).toEqual([
    'GET /service/default/puck-pages/a%2Fb',
    'GET /service/products/search?text=red+shirt&limit=5',
    'GET /service/default/configuration/theme',
    'GET /service/datasource',
    'POST /service/default/puck-pages',
    'POST /service/default/content-type/import',
  ]);
  expect(JSON.parse(seen[4]?.body ?? '{}')).toEqual({ value: { name: 'N', slug: '/n' } });
});

test('the slug injection attempt is escaped in the query body', async () => {
  respond(200, []);
  await call(makeTestApp(), 'query_published_puck_page', { slug: '/x" OR key = "y' });
  expect(JSON.parse(seen[0]?.body ?? '{}')).toEqual({ query: 'slug = "/x\\" OR key = \\"y"' });
});

test('a newline in the slug is an error result and no service call', async () => {
  respond(200, []);
  const r = await call(makeTestApp(), 'query_published_puck_page', { slug: '/x\ny' });
  expect(r.body.result.isError).toBe(true);
  expect(seen).toHaveLength(0);
});

test('a service 404 is an error result', async () => {
  respond(404, { message: 'Page not found' });
  const r = await call(makeTestApp(), 'get_puck_page', { key: 'nope' });
  expect(r.status).toBe(200);
  expect(r.body.result.isError).toBe(true);
  expect(toolText(r.body)).toMatch(/^Service returned 404/);
  expect(toolText(r.body)).toContain('Page not found');
});

test('list_media sends cursor pagination and rejects page', async () => {
  respond(200, { files: [], pagination: { limit: 20, nextCursor: null, hasMore: false } });
  const app = makeTestApp();
  await call(app, 'list_media', { limit: 20, cursor: 'abc', extensions: ['png', 'jpg'] });
  expect(new URL(seen[0]?.url ?? '').search).toBe('?limit=20&cursor=abc&extensions=png%2Cjpg');
  const before = seen.length;
  const r = await call(app, 'list_media', { page: 2 });
  expect(r.body.result?.isError === true || r.body.error !== undefined).toBe(true);
  expect(seen).toHaveLength(before);
});

test('upload_media surfaces the 501 code', async () => {
  respond(501, { message: 'Media storage is not configured', statusCode: 501, code: 'MEDIA_NOT_CONFIGURED' });
  const r = await call(makeTestApp({ writes: true }), 'upload_media', { fileName: 'a.png', fileContentBase64: 'AAAA' });
  expect(r.body.result.isError).toBe(true);
  expect(toolText(r.body)).toContain('MEDIA_NOT_CONFIGURED');
});

test('upload_media sends a multipart file', async () => {
  let name = '';
  let content = '';
  svc.use(
    http.post(`${SERVICE_BASE}/default/upload-file`, async ({ request: r }) => {
      const f = (await r.formData()).get('file') as File;
      name = f.name;
      content = Buffer.from(await f.arrayBuffer()).toString();
      return HttpResponse.json({ url: 'https://cdn/x' }, { status: 201 });
    })
  );
  const r = await call(makeTestApp({ writes: true }), 'upload_media', {
    fileName: 'a.txt',
    fileContentBase64: Buffer.from('hello').toString('base64'),
  });
  expect(r.body.result.isError).toBeUndefined();
  expect([name, content]).toEqual(['a.txt', 'hello']);
});

test('upload_media over 5 MiB is an error result and no service call', async () => {
  respond(201, {});
  const big = 'A'.repeat(Math.ceil((5 * 1024 * 1024 * 4) / 3) + 8);
  const r = await call(makeTestApp({ writes: true }), 'upload_media', { fileName: 'a.png', fileContentBase64: big });
  expect(r.body.result.isError).toBe(true);
  expect(toolText(r.body)).toContain('5 MiB');
  expect(seen).toHaveLength(0);
});

test('a stalled service times out as an error result while HTTP stays 200', async () => {
  svc.use(http.all(`${SERVICE_BASE}/*`, async () => { await delay('infinite'); return HttpResponse.json({}); }));
  const r = await call(makeTestApp({ timeoutMs: 1000 }), 'list_puck_pages');
  expect(r.status).toBe(200);
  expect(r.body.result.isError).toBe(true);
  expect(toolText(r.body)).toContain('timed out');
}, 10000);

test('204 becomes OK (no content)', async () => {
  respond(204, null);
  const r = await call(makeTestApp({ writes: true }), 'delete_puck_page', { key: 'home' });
  expect(toolText(r.body)).toBe('OK (no content)');
});

test('log hygiene: logs name the tool but never arguments or tokens', async () => {
  respond(201, { key: 'k' });
  const chunks: string[] = [];
  const spy = jest.spyOn(process.stdout, 'write').mockImplementation((c: unknown) => {
    chunks.push(String(c));
    return true;
  });
  try {
    await call(makeTestApp({ writes: true }), 'create_puck_page', { value: { name: 'Secret launch', slug: '/s' } });
  } finally {
    spy.mockRestore();
  }
  const out = chunks.join('');
  expect(out).toContain('create_puck_page');
  expect(out).toContain('outcome');
  expect(out).not.toContain('Secret launch');
  expect(out).not.toContain('a'.repeat(40));
  expect(out).not.toContain('S'.repeat(40));
});
