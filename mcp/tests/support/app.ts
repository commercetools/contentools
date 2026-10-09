/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import request from 'supertest';
import { ContentoolsClient } from '../../src/core';
import { buildApp } from '../../src/server/app';
import { loadConfig } from '../../src/server/config';

export const SERVICE_BASE = 'https://svc.test/service';
export const MCP_TOKEN = 'a'.repeat(40);
export const SERVICE_TOKEN = 'S'.repeat(40);

export const H = {
  Authorization: `Bearer ${MCP_TOKEN}`,
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
};

export interface TestAppOptions {
  writes?: boolean;
  groups?: string;
  origins?: string;
  timeoutMs?: number;
  tokens?: string;
}

export function makeTestApp(o: TestAppOptions = {}) {
  const config = loadConfig({
    CONTENT_SERVICE_URL: SERVICE_BASE,
    MCP_ACCESS_TOKEN: o.tokens ?? MCP_TOKEN,
    SERVICE_API_TOKEN: SERVICE_TOKEN,
    MCP_ENABLE_WRITES: o.writes ? 'true' : 'false',
    MCP_TOOL_GROUPS: o.groups,
    MCP_ALLOWED_ORIGINS: o.origins,
    MCP_REQUEST_TIMEOUT_MS: String(o.timeoutMs ?? 2000),
  });
  const client = new ContentoolsClient({
    baseUrl: config.serviceUrl,
    token: config.serviceToken,
    timeoutMs: config.timeoutMs,
  });
  return buildApp({ config, client });
}

export const rpc = (method: string, params?: unknown, id: number = 1) => ({
  jsonrpc: '2.0',
  id,
  method,
  ...(params === undefined ? {} : { params }),
});

export const call = (
  app: ReturnType<typeof makeTestApp>,
  name: string,
  args: Record<string, unknown> = {}
) => request(app).post('/mcp').set(H).send(rpc('tools/call', { name, arguments: args }));

export const toolText = (body: {
  result?: { content?: Array<{ text: string }>; isError?: boolean };
}): string => body.result?.content?.[0]?.text ?? '';

/** msw would also intercept supertest's loopback requests; ignore those, fail on any other unmocked host. */
export const onUnhandledRequest = (
  req: Request,
  print: { error: () => void }
): void => {
  const h = new URL(req.url).hostname;
  if (h === '127.0.0.1' || h === 'localhost' || h === '::1') return;
  print.error();
};
