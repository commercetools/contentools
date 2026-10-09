/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createLangChainTools } from '../../src/adapters/langchain';
import { createAiSdkTools } from '../../src/adapters/ai-sdk';

const BASE = 'http://svc.test/service';
const opts = { baseUrl: BASE, token: 'T'.repeat(40) };
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('invoke calls the service', async () => {
  let url = '';
  server.use(
    http.get(`${BASE}/default/puck-pages/:key`, ({ request }) => {
      url = request.url;
      return HttpResponse.json({ key: 'k' });
    })
  );
  const tool = createLangChainTools(opts).find((t) => t.name === 'get_puck_page');
  expect(tool).toBeDefined();
  const out = await tool!.invoke({ key: 'k' });
  expect(url).toBe(`${BASE}/default/puck-pages/k`);
  expect(String(out)).toContain('"key"');
});

test('tool names equal the AI SDK adapter names', () => {
  const lc = createLangChainTools({ ...opts, enableWrites: true }).map((t) => t.name).sort();
  const ai = Object.keys(createAiSdkTools({ ...opts, enableWrites: true })).sort();
  expect(lc).toEqual(ai);
  expect(lc).toHaveLength(44);
});

test('unknown keys are rejected by schema validation (LangChain throws)', async () => {
  const tool = createLangChainTools(opts).find((t) => t.name === 'get_puck_page')!;
  await expect(tool.invoke({ key: 'k', token: 'x' })).rejects.toThrow();
});
