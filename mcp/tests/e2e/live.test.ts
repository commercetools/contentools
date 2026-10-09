/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ContentoolsClient } from '../../src/core';
import { buildApp } from '../../src/server/app';
import { loadConfig } from '../../src/server/config';

// Runs only when MCP_E2E_SERVICE_URL and MCP_E2E_SERVICE_TOKEN point at a running content service.
// Optional: MCP_E2E_BUSINESS_UNIT_KEY (default "default").
const URL_ = process.env.MCP_E2E_SERVICE_URL;
const TOKEN = process.env.MCP_E2E_SERVICE_TOKEN;
const live = URL_ && TOKEN ? describe : describe.skip;
const MCP_TOKEN = 'e'.repeat(40);

type Result = { isError?: boolean; content: Array<{ type: string; text?: string }> };
const text = (r: unknown): string => (r as Result).content[0]?.text ?? '';
const json = (r: unknown): any => JSON.parse(text(r));

async function start(serviceToken: string): Promise<{ server: Server; client: Client }> {
  const config = loadConfig({
    CONTENT_SERVICE_URL: URL_,
    MCP_ACCESS_TOKEN: MCP_TOKEN,
    SERVICE_API_TOKEN: serviceToken,
    MCP_ENABLE_WRITES: 'true',
    DEFAULT_BUSINESS_UNIT_KEY: process.env.MCP_E2E_BUSINESS_UNIT_KEY ?? 'default',
    MCP_REQUEST_TIMEOUT_MS: '30000',
  });
  const app = buildApp({
    config,
    client: new ContentoolsClient({ baseUrl: config.serviceUrl, token: config.serviceToken, timeoutMs: config.timeoutMs }),
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const client = new Client({ name: 'e2e', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${MCP_TOKEN}` } },
    })
  );
  return { server, client };
}

live('live content service', () => {
  let ctx: { server: Server; client: Client };
  let pageKey: string | undefined;
  const stamp = Date.now();

  beforeAll(async () => {
    ctx = await start(TOKEN as string);
  });
  afterAll(async () => {
    if (pageKey) {
      await ctx.client.callTool({ name: 'delete_puck_page', arguments: { key: pageKey } }).catch(() => undefined);
    }
    await ctx.client.close();
    await new Promise((resolve) => ctx.server.close(resolve));
  });

  test('page lifecycle: create, preview, publish, query by slug, versions, delete', async () => {
    const slug = `/mcp-e2e-${stamp}`;
    const created = await ctx.client.callTool({
      name: 'create_puck_page',
      arguments: { value: { name: `MCP e2e ${stamp}`, slug, puckData: { content: [], root: {} } } },
    });
    expect((created as Result).isError).toBeUndefined();
    pageKey = json(created).key;
    expect(typeof pageKey).toBe('string');

    const preview = await ctx.client.callTool({ name: 'get_preview_puck_page', arguments: { key: pageKey } });
    expect((preview as Result).isError).toBeUndefined();

    const published = await ctx.client.callTool({ name: 'publish_puck_page', arguments: { key: pageKey } });
    expect((published as Result).isError).toBeUndefined();

    const found = await ctx.client.callTool({ name: 'query_published_puck_page', arguments: { slug } });
    expect((found as Result).isError).toBeUndefined();
    expect(text(found)).toContain(slug);

    const versions = await ctx.client.callTool({ name: 'get_puck_page_versions', arguments: { key: pageKey } });
    expect((versions as Result).isError).toBeUndefined();
    expect(JSON.parse(text(versions)).versions.length).toBeGreaterThanOrEqual(1);

    const removed = await ctx.client.callTool({ name: 'delete_puck_page', arguments: { key: pageKey } });
    expect((removed as Result).isError).toBeUndefined();
    pageKey = undefined;
  }, 120000);

  test('product search and configuration reads work', async () => {
    const products = await ctx.client.callTool({ name: 'search_products', arguments: { text: 'a', limit: 2 } });
    expect((products as Result).isError).toBeUndefined();
    const theme = await ctx.client.callTool({ name: 'get_configuration', arguments: { slice: 'theme' } });
    expect(text(theme)).not.toMatch(/^Service returned 5/);
  }, 60000);

  test('media: list_media answers a cursor result or MEDIA_NOT_CONFIGURED', async () => {
    const media = await ctx.client.callTool({ name: 'list_media', arguments: { limit: 5 } });
    if ((media as Result).isError) expect(text(media)).toContain('MEDIA_NOT_CONFIGURED');
    else expect(json(media).pagination).toBeDefined();
  }, 60000);

  test('a wrong service token yields an error result with 401', async () => {
    const wrong = await start('W'.repeat(40));
    try {
      const r = await wrong.client.callTool({ name: 'get_preview_puck_page', arguments: { key: 'nope' } });
      expect((r as Result).isError).toBe(true);
      expect(text(r)).toContain('Service returned 401');
    } finally {
      await wrong.client.close();
      await new Promise((resolve) => wrong.server.close(resolve));
    }
  }, 60000);
});
