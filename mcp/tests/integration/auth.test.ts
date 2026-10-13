/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import {
  H,
  MCP_TOKEN,
  SERVICE_BASE,
  SERVICE_TOKEN,
  call,
  makeTestApp,
  onUnhandledRequest,
  rpc,
  toolText,
} from '../support/app';

const svc = setupServer();
let serviceCalls = 0;
let lastHeaders: Headers | undefined;
beforeAll(() => svc.listen({ onUnhandledRequest }));
beforeEach(() => {
  serviceCalls = 0;
  lastHeaders = undefined;
  svc.use(
    http.all(`${SERVICE_BASE}/*`, ({ request: r }) => {
      serviceCalls += 1;
      lastHeaders = r.headers;
      return HttpResponse.json({ key: 'home' });
    })
  );
});
afterEach(() => svc.resetHandlers());
afterAll(() => svc.close());

const rejected: Array<[string, string | undefined]> = [
  ['no header', undefined],
  ['empty', ''],
  ['Basic', 'Basic x'],
  ['scheme only', 'Bearer'],
  ['scheme and space', 'Bearer '],
  ['lowercase scheme', `bearer ${MCP_TOKEN}`],
  ['wrong token', 'Bearer wrong'],
  ['prefix', `Bearer ${MCP_TOKEN.slice(0, 39)}`],
  ['inner space', `Bearer ${MCP_TOKEN.slice(0, 5)} ${MCP_TOKEN.slice(5)}`],
];

describe.each(['initialize', 'tools/list', 'tools/call'])('%s', (method) => {
  test.each(rejected)('rejects %s with 401 and no service call', async (_l, header) => {
    const headers: Record<string, string> = { Accept: H.Accept, 'Content-Type': 'application/json' };
    if (header !== undefined) headers.Authorization = header;
    const params = method === 'tools/call' ? { name: 'list_puck_pages', arguments: {} } : undefined;
    const r = await request(makeTestApp()).post('/mcp').set(headers).send(rpc(method, params));
    expect(r.status).toBe(401);
    expect(r.headers['www-authenticate']).toBe('Bearer realm="contentools-mcp"');
    expect(r.body.error.code).toBe(-32001);
    expect(serviceCalls).toBe(0);
  });
});

test('both rotation tokens are accepted', async () => {
  const old = 'b'.repeat(40);
  const app = makeTestApp({ tokens: `${MCP_TOKEN},${old}` });
  for (const t of [MCP_TOKEN, old]) {
    const r = await request(app).post('/mcp').set({ ...H, Authorization: `Bearer ${t}` }).send(rpc('tools/list'));
    expect(r.status).toBe(200);
  }
});

test('status stays open', async () => {
  expect((await request(makeTestApp()).get('/mcp/status')).status).toBe(200);
});

test('a foreign Origin is rejected even with the right token', async () => {
  const r = await request(makeTestApp()).post('/mcp').set({ ...H, Origin: 'https://evil.example' }).send(rpc('tools/list'));
  expect(r.status).toBe(403);
  expect(serviceCalls).toBe(0);
});

test('an allowed Origin passes', async () => {
  const app = makeTestApp({ origins: 'https://ok.example' });
  const r = await request(app).post('/mcp').set({ ...H, Origin: 'https://ok.example' }).send(rpc('tools/list'));
  expect(r.status).toBe(200);
});

test('no passthrough: the service is called with its own token, source and a correlation id', async () => {
  const r = await call(makeTestApp(), 'get_preview_puck_page', { key: 'home' });
  expect(r.status).toBe(200);
  expect(lastHeaders?.get('authorization')).toBe(`Bearer ${SERVICE_TOKEN}`);
  expect(lastHeaders?.get('authorization')).not.toContain(MCP_TOKEN);
  expect(lastHeaders?.get('x-source')).toBe('mcp');
  expect(lastHeaders?.get('x-correlation-id')).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
});

test.each(['jwtToken', 'projectKey', 'baseUrl'])('extra argument %s is rejected without a service call', async (extra) => {
  const r = await call(makeTestApp(), 'get_preview_puck_page', { key: 'home', [extra]: 'x' });
  expect(r.status).toBe(200);
  const failed = r.body.error !== undefined || r.body.result?.isError === true;
  expect(failed).toBe(true);
  expect(toolText(r.body) + JSON.stringify(r.body.error ?? '')).toMatch(/Unrecognized key|-32602|Invalid input/);
  expect(serviceCalls).toBe(0);
});

test('error responses never leak either token', async () => {
  const r = await request(makeTestApp()).post('/mcp').set({ ...H, Authorization: 'Bearer wrong' }).send(rpc('tools/list'));
  expect(r.text).not.toContain(MCP_TOKEN);
  expect(r.text).not.toContain(SERVICE_TOKEN);
});
