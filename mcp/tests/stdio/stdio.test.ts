/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { buildFakeService } from '../support/fake-service';

const ROOT = path.resolve(__dirname, '../..');
const BIN = path.join(ROOT, 'dist/stdio/index.js');
const TOKEN = 'S'.repeat(40);
let http: Server;
let baseUrl: string;

jest.setTimeout(120000);

beforeAll(async () => {
  execFileSync('yarn', ['-s', 'build:npm'], { cwd: ROOT, stdio: 'ignore' });
  http = buildFakeService(TOKEN).listen(0, '127.0.0.1');
  await new Promise((r) => http.once('listening', r));
  baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}/service`;
});
afterAll(() => new Promise((r) => http.close(r)));

async function connect(extra: Record<string, string> = {}): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BIN],
    env: {
      PATH: process.env.PATH ?? '',
      CONTENT_SERVICE_URL: baseUrl,
      SERVICE_API_TOKEN: TOKEN,
      ...extra,
    },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'stdio-test', version: '0' });
  await client.connect(transport);
  return client;
}

test('lists 24 read tools by default', async () => {
  const client = await connect();
  try {
    expect((await client.listTools()).tools).toHaveLength(24);
  } finally {
    await client.close();
  }
});

test('MCP_ENABLE_WRITES=true lists 44 and a tool call works', async () => {
  const client = await connect({ MCP_ENABLE_WRITES: 'true' });
  try {
    expect((await client.listTools()).tools).toHaveLength(44);
    const r = await client.callTool({ name: 'get_puck_page', arguments: { key: 'home' } });
    expect(r.isError).toBeFalsy();
    expect(JSON.stringify(r.content)).toContain('Home');
  } finally {
    await client.close();
  }
});

test('missing SERVICE_API_TOKEN exits 1 and names the variable', () => {
  const r = spawnSync(process.execPath, [BIN], {
    env: { PATH: process.env.PATH ?? '', CONTENT_SERVICE_URL: baseUrl },
    encoding: 'utf8',
  });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('SERVICE_API_TOKEN');
});
