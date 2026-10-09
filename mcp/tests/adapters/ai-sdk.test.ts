/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createAiSdkTools } from '../../src/adapters/ai-sdk';
import { ALL_TOOLS } from '../../src/core';

const BASE = 'http://svc.test/service';
const TOKEN = 'T'.repeat(40);
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const opts = { baseUrl: BASE, token: TOKEN };
const run = (t: unknown, args: unknown): Promise<string> =>
  (t as { execute: (a: unknown, o: unknown) => Promise<string> }).execute(args, {
    toolCallId: '1',
    messages: [],
  });

test('read-only by default, writes on request', () => {
  const ro = createAiSdkTools(opts);
  expect(Object.keys(ro)).toHaveLength(24);
  expect(ro.create_puck_page).toBeUndefined();
  const rw = createAiSdkTools({ ...opts, enableWrites: true });
  expect(Object.keys(rw).sort()).toEqual(ALL_TOOLS.map((t) => t.name).sort());
});

test('executes a tool against the service with the bearer token', async () => {
  let seen: { url?: string; auth?: string | null } = {};
  server.use(
    http.get(`${BASE}/default/puck-pages/:key`, ({ request }) => {
      seen = { url: request.url, auth: request.headers.get('authorization') };
      return HttpResponse.json({ key: 'a b' });
    })
  );
  const text = await run(createAiSdkTools(opts).get_puck_page, { key: 'a b' });
  expect(seen.url).toBe('http://svc.test/service/default/puck-pages/a%20b');
  expect(seen.auth).toBe(`Bearer ${TOKEN}`);
  expect(text).toContain('a b');
});

test('service errors resolve to text', async () => {
  server.use(
    http.get(`${BASE}/default/puck-pages/:key`, () =>
      HttpResponse.json({ message: 'Page not found' }, { status: 404 })
    )
  );
  const text = await run(createAiSdkTools(opts).get_puck_page, { key: 'x' });
  expect(text).toMatch(/^Service returned 404/);
});

test('extra keys are rejected as text, token never leaks', async () => {
  const text = await run(createAiSdkTools(opts).get_puck_page, { key: 'x', token: 'y' });
  expect(text).toMatch(/^Invalid input/);
  expect(text).not.toContain(TOKEN);
});
