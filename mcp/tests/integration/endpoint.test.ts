/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import request from 'supertest';
import { setupServer } from 'msw/node';
import { H, makeTestApp, onUnhandledRequest, rpc } from '../support/app';

const svc = setupServer();
beforeAll(() => svc.listen({ onUnhandledRequest }));
afterEach(() => svc.resetHandlers());
afterAll(() => svc.close());

test('initialize then tools/list as separate requests without a session header', async () => {
  const app = makeTestApp();
  const init = await request(app)
    .post('/mcp')
    .set(H)
    .send(rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } }));
  expect(init.status).toBe(200);
  expect(init.headers['mcp-session-id']).toBeUndefined();
  expect(init.body.result.serverInfo.name).toBe('contentools-mcp');
  const list = await request(app).post('/mcp').set(H).send(rpc('tools/list', undefined, 2));
  expect(list.status).toBe(200);
  expect(list.body.result.tools).toHaveLength(24);
});

test('two app instances answer independently (stateless)', async () => {
  const [a, b] = [makeTestApp(), makeTestApp()];
  const r = await request(b).post('/mcp').set(H).send(rpc('tools/list'));
  expect(r.status).toBe(200);
  expect((await request(a).post('/mcp').set(H).send(rpc('tools/list'))).status).toBe(200);
});

test.each(['get', 'delete', 'put'] as const)('%s /mcp answers 405 with Allow: POST', async (m) => {
  const r = await request(makeTestApp())[m]('/mcp').set({ Authorization: H.Authorization });
  expect(r.status).toBe(405);
  expect(r.headers.allow).toBe('POST');
  expect(r.body.error.code).toBe(-32000);
});

test('invalid JSON answers 400 with a parse error', async () => {
  const r = await request(makeTestApp()).post('/mcp').set(H).send('{not json');
  expect(r.status).toBe(400);
  expect(r.body.error.code).toBe(-32700);
});

test('body over 8 MB answers 413', async () => {
  const big = JSON.stringify(rpc('tools/list', { pad: 'x'.repeat(9 * 1024 * 1024) }));
  const r = await request(makeTestApp()).post('/mcp').set(H).send(big);
  expect(r.status).toBe(413);
  expect(r.body.error.code).toBe(-32600);
});

test('GET /mcp/status is open and reveals nothing', async () => {
  const r = await request(makeTestApp()).get('/mcp/status');
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ status: 'ok' });
});

test('x-powered-by is not sent', async () => {
  const r = await request(makeTestApp()).get('/mcp/status');
  expect(r.headers['x-powered-by']).toBeUndefined();
});
