/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MCP_URL ?? 'http://localhost:8080/mcp');
const token = process.env.MCP_ACCESS_TOKEN;
if (!token) {
  console.error('Set MCP_ACCESS_TOKEN');
  process.exit(2);
}
const expectWrites = process.env.EXPECT_WRITES === 'true';
const pageKey = process.env.VERIFY_PAGE_KEY ?? 'home';

const connect = async (bearer) => {
  const c = new Client({ name: 'verify', version: '1.0.0' });
  await c.connect(
    new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${bearer}` } } })
  );
  return c;
};
const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  process.exit(1);
};

// Wrong token: the connection must be rejected with a 401.
try {
  await connect('wrong-token-wrong-token-wrong-token-0000');
  fail('wrong token was accepted');
} catch (e) {
  if (!/401|Unauthorized/i.test(String(e?.message ?? e))) fail(`wrong token error did not mention 401: ${e?.message}`);
}

const c = await connect(token);
const tools = (await c.listTools()).tools.map((t) => t.name);
if (tools.length !== (expectWrites ? 44 : 24)) fail(`tool count ${tools.length}`);

const list = await c.callTool({ name: 'list_puck_pages', arguments: {} });
if (list.isError) fail(`list_puck_pages ${JSON.stringify(list.content)}`);

// A protected route proves the app sends its own service token.
const preview = await c.callTool({ name: 'get_preview_puck_page', arguments: { key: pageKey } });
if (preview.isError) fail(`get_preview_puck_page ${JSON.stringify(preview.content)}`);

const bogus = await c.callTool({ name: 'get_preview_puck_page', arguments: { key: '__no_such_page__' } });
if (!bogus.isError || !String(bogus.content[0]?.text).includes('404')) fail('bogus key did not return an error result with 404');

console.log(`OK ${tools.length} tools; list_puck_pages returned ${list.content[0].text.length} chars`);
await c.close();
