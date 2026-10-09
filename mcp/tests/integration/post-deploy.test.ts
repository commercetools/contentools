/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { run } from '../../src/server/post-deploy';
import { MCP_TOKEN, SERVICE_BASE, SERVICE_TOKEN } from '../support/app';

const svc = setupServer();
beforeAll(() => svc.listen({ onUnhandledRequest: 'error' }));
afterEach(() => svc.resetHandlers());
afterAll(() => svc.close());

const env = {
  CONTENT_SERVICE_URL: SERVICE_BASE,
  MCP_ACCESS_TOKEN: MCP_TOKEN,
  SERVICE_API_TOKEN: SERVICE_TOKEN,
};
const PROBE = `${SERVICE_BASE}/default/preview/puck-pages/__contentools_mcp_probe__`;

let out: jest.SpyInstance[];
beforeEach(() => {
  out = [
    jest.spyOn(console, 'log').mockImplementation(() => undefined),
    jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    jest.spyOn(console, 'error').mockImplementation(() => undefined),
  ];
  svc.use(http.get(`${SERVICE_BASE}/health`, () => HttpResponse.json({ status: 'UP' })));
});
afterEach(() => out.forEach((s) => s.mockRestore()));

test('404 from the probe means credentials were accepted: exit 0', async () => {
  let auth: string | null = null;
  svc.use(
    http.get(PROBE, ({ request }) => {
      auth = request.headers.get('authorization');
      return HttpResponse.json({ message: 'not found' }, { status: 404 });
    })
  );
  expect(await run(env)).toBe(0);
  expect(auth).toBe(`Bearer ${SERVICE_TOKEN}`);
});

test.each([401, 403])('%s from the probe fails the deployment', async (status) => {
  svc.use(http.get(PROBE, () => HttpResponse.json({ message: 'no' }, { status })));
  expect(await run(env)).toBe(1);
});

test('network error on the probe warns and exits 0', async () => {
  svc.use(http.get(PROBE, () => HttpResponse.error()));
  expect(await run(env)).toBe(0);
  expect(console.warn).toHaveBeenCalled();
});

test('5xx on the probe warns and exits 0', async () => {
  svc.use(http.get(PROBE, () => new HttpResponse('boom', { status: 500 })));
  expect(await run(env)).toBe(0);
});

test('an unreachable health route skips the probe and exits 0', async () => {
  svc.use(http.get(`${SERVICE_BASE}/health`, () => HttpResponse.error()));
  expect(await run(env)).toBe(0);
  expect(console.warn).toHaveBeenCalled();
});

test('never prints a token', async () => {
  svc.use(http.get(PROBE, () => HttpResponse.json({ message: 'no' }, { status: 401 })));
  await run(env);
  const printed = JSON.stringify([...out.map((s) => s.mock.calls)]);
  expect(printed).not.toContain(SERVICE_TOKEN);
  expect(printed).not.toContain(MCP_TOKEN);
});
