/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAiSdkTools } from '../../src/adapters/ai-sdk';
import { createLangChainTools } from '../../src/adapters/langchain';
import { createContentoolsMcpServer } from '../../src/mcp';
import { ALL_TOOLS, ContentoolsClient, selectTools } from '../../src/core';

const BASE = 'http://svc.test/service';
const TOKEN = 'T'.repeat(40);
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('same catalog and identical request across ai-sdk, langchain and MCP', async () => {
  const seen: string[] = [];
  server.use(
    http.get(`${BASE}/default/puck-pages/:key`, ({ request }) => {
      seen.push(`${request.method} ${request.url} ${request.headers.get('authorization')}`);
      return HttpResponse.json({ key: 'k' });
    })
  );
  const opts = { baseUrl: BASE, token: TOKEN, enableWrites: true };

  const ai = createAiSdkTools(opts);
  await (ai.get_puck_page as unknown as { execute: (a: unknown, o: unknown) => Promise<string> }).execute(
    { key: 'k' },
    { toolCallId: '1', messages: [] }
  );
  const lc = createLangChainTools(opts);
  await lc.find((t) => t.name === 'get_puck_page')!.invoke({ key: 'k' });

  const mcp = createContentoolsMcpServer({
    tools: selectTools({ groups: 'all', enableWrites: true }),
    client: new ContentoolsClient({ baseUrl: BASE, token: TOKEN, timeoutMs: 2000 }),
    ctx: { defaultBusinessUnitKey: 'default' },
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 't', version: '0' });
  await Promise.all([mcp.connect(a), client.connect(b)]);
  const listed = await client.listTools();
  await client.callTool({ name: 'get_puck_page', arguments: { key: 'k' } });
  await client.close();

  const names = ALL_TOOLS.map((t) => t.name).sort();
  expect(Object.keys(ai).sort()).toEqual(names);
  expect(lc.map((t) => t.name).sort()).toEqual(names);
  expect(listed.tools.map((t) => t.name).sort()).toEqual(names);

  expect(seen).toHaveLength(3);
  expect(new Set(seen).size).toBe(1);
  expect(seen[0]).toBe(`GET ${BASE}/default/puck-pages/k Bearer ${TOKEN}`);
});
