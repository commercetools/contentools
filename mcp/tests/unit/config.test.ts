/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { loadConfig } from '../../src/server/config';

const A = 'A'.repeat(40);
const S = 'T'.repeat(40);
const base = {
  CONTENT_SERVICE_URL: 'https://svc.example.com/service/',
  MCP_ACCESS_TOKEN: A,
  SERVICE_API_TOKEN: S,
};
const fail = (env: NodeJS.ProcessEnv): string => {
  try {
    loadConfig(env);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected loadConfig to throw');
};

test('valid minimal environment gets defaults', () => {
  const c = loadConfig(base);
  expect(c).toMatchObject({
    port: 8080,
    serviceUrl: 'https://svc.example.com/service',
    tokens: [A],
    serviceToken: S,
    defaultBusinessUnitKey: 'default',
    enableWrites: false,
    groups: 'all',
    timeoutMs: 15000,
  });
  expect(c.allowedOrigins.size).toBe(0);
});

test('parses lists and flags', () => {
  const c = loadConfig({
    ...base,
    MCP_ACCESS_TOKEN: `${A}, ${'B'.repeat(40)}`,
    MCP_ENABLE_WRITES: 'true',
    MCP_TOOL_GROUPS: 'pages,media',
    MCP_ALLOWED_ORIGINS: 'https://a.example, https://b.example',
    MCP_REQUEST_TIMEOUT_MS: '3000',
    DEFAULT_BUSINESS_UNIT_KEY: 'main-bu',
  });
  expect(c.tokens).toHaveLength(2);
  expect(c.enableWrites).toBe(true);
  expect(c.groups).toEqual(['pages', 'media']);
  expect([...c.allowedOrigins]).toEqual(['https://a.example', 'https://b.example']);
  expect(c.timeoutMs).toBe(3000);
  expect(c.defaultBusinessUnitKey).toBe('main-bu');
});

test.each([
  ['CONTENT_SERVICE_URL', { CONTENT_SERVICE_URL: undefined }],
  ['CONTENT_SERVICE_URL', { CONTENT_SERVICE_URL: 'not a url' }],
  ['CONTENT_SERVICE_URL', { CONTENT_SERVICE_URL: 'http://example.com/service' }],
  ['MCP_ACCESS_TOKEN', { MCP_ACCESS_TOKEN: undefined }],
  ['MCP_ACCESS_TOKEN', { MCP_ACCESS_TOKEN: 'short' }],
  ['SERVICE_API_TOKEN', { SERVICE_API_TOKEN: undefined }],
  ['SERVICE_API_TOKEN', { SERVICE_API_TOKEN: 'short' }],
  ['MCP_ENABLE_WRITES', { MCP_ENABLE_WRITES: 'yes' }],
  ['MCP_TOOL_GROUPS', { MCP_TOOL_GROUPS: 'nope' }],
  ['MCP_REQUEST_TIMEOUT_MS', { MCP_REQUEST_TIMEOUT_MS: '10' }],
  ['MCP_REQUEST_TIMEOUT_MS', { MCP_REQUEST_TIMEOUT_MS: 'abc' }],
])('invalid %s is named in the error', (name, override) => {
  expect(fail({ ...base, ...override })).toContain(name);
});

test('the same value for both secrets is a problem', () => {
  expect(fail({ ...base, SERVICE_API_TOKEN: A })).toContain('different secrets');
});

test('http is allowed for localhost only', () => {
  expect(loadConfig({ ...base, CONTENT_SERVICE_URL: 'http://localhost:8080/service' }).serviceUrl).toBe(
    'http://localhost:8080/service'
  );
  expect(loadConfig({ ...base, CONTENT_SERVICE_URL: 'http://127.0.0.1:8080/service' }).serviceUrl).toContain('127.0.0.1');
});

test('collects every problem and never echoes token values', () => {
  const msg = fail({ CONTENT_SERVICE_URL: '', MCP_ACCESS_TOKEN: 'T'.repeat(5), SERVICE_API_TOKEN: 'U'.repeat(6) });
  expect(msg).toContain('CONTENT_SERVICE_URL');
  expect(msg).toContain('MCP_ACCESS_TOKEN');
  expect(msg).toContain('SERVICE_API_TOKEN');
  expect(msg).not.toContain('TTTTT');
  expect(msg).not.toContain('UUUUUU');
  expect(fail({ ...base, MCP_TOOL_GROUPS: 'x', SERVICE_API_TOKEN: S.slice(0, 10) })).not.toContain(S);
});
