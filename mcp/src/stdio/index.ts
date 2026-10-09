/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContentoolsClient, selectTools, parseGroups } from '../core';
import { createContentoolsMcpServer } from '../mcp';

// stdout belongs to JSON-RPC: write diagnostics to stderr only.
function need(n: string): string {
  const v = process.env[n];
  if (!v) {
    process.stderr.write(`Missing environment variable ${n}\n`);
    process.exit(1);
  }
  return v;
}

async function main(): Promise<void> {
  const baseUrl = need('CONTENT_SERVICE_URL');
  const token = need('SERVICE_API_TOKEN');
  const client = new ContentoolsClient({
    baseUrl,
    token,
    timeoutMs: Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000),
  });
  const tools = selectTools({
    groups: parseGroups(process.env.MCP_TOOL_GROUPS),
    enableWrites: process.env.MCP_ENABLE_WRITES === 'true',
  });
  const server = createContentoolsMcpServer({
    tools,
    client,
    ctx: { defaultBusinessUnitKey: process.env.DEFAULT_BUSINESS_UNIT_KEY ?? 'default' },
  });
  await server.connect(new StdioServerTransport());
  process.stderr.write('contentools-mcp running on stdio\n');
}

main().catch((e: unknown) => {
  process.stderr.write(`contentools-mcp error: ${e instanceof Error ? e.message : 'unknown'}\n`);
  process.exit(1);
});
