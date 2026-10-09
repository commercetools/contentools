/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { parseGroups } from '../core/registry';
import type { ToolGroup } from '../core/types';

export interface Config {
  port: number;
  serviceUrl: string;
  tokens: string[];
  serviceToken: string;
  defaultBusinessUnitKey: string;
  enableWrites: boolean;
  groups: 'all' | ToolGroup[];
  allowedOrigins: Set<string>;
  timeoutMs: number;
}

const MIN_TOKEN = 32;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];

  let serviceUrl = '';
  const rawUrl = env.CONTENT_SERVICE_URL?.trim() ?? '';
  if (rawUrl === '') {
    problems.push('CONTENT_SERVICE_URL is required');
  } else {
    try {
      const u = new URL(rawUrl);
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) {
        problems.push('CONTENT_SERVICE_URL must use https (http is allowed only for localhost)');
      } else {
        serviceUrl = rawUrl.replace(/\/+$/, '');
      }
    } catch {
      problems.push('CONTENT_SERVICE_URL must be a valid URL');
    }
  }

  const tokens = (env.MCP_ACCESS_TOKEN ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '');
  if (tokens.length === 0) {
    problems.push('MCP_ACCESS_TOKEN is required');
  } else if (tokens.some((t) => t.length < MIN_TOKEN)) {
    problems.push(`MCP_ACCESS_TOKEN: every token must be at least ${MIN_TOKEN} characters`);
  }

  const serviceToken = (env.SERVICE_API_TOKEN ?? '').trim();
  if (serviceToken === '') {
    problems.push('SERVICE_API_TOKEN is required');
  } else if (serviceToken.length < MIN_TOKEN) {
    problems.push(`SERVICE_API_TOKEN must be at least ${MIN_TOKEN} characters`);
  }
  if (serviceToken !== '' && tokens.includes(serviceToken)) {
    problems.push('MCP_ACCESS_TOKEN and SERVICE_API_TOKEN must be different secrets');
  }

  const writes = (env.MCP_ENABLE_WRITES ?? 'false').trim() || 'false';
  if (writes !== 'true' && writes !== 'false') {
    problems.push('MCP_ENABLE_WRITES must be "true" or "false"');
  }

  let groups: 'all' | ToolGroup[] = 'all';
  try {
    groups = parseGroups(env.MCP_TOOL_GROUPS);
  } catch (e) {
    problems.push(`MCP_TOOL_GROUPS is invalid: ${(e as Error).message}`);
  }

  let timeoutMs = 15000;
  const rawTimeout = (env.MCP_REQUEST_TIMEOUT_MS ?? '').trim();
  if (rawTimeout !== '') {
    timeoutMs = Number(rawTimeout);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
      problems.push('MCP_REQUEST_TIMEOUT_MS must be an integer from 1000 to 120000');
    }
  }

  const allowedOrigins = new Set(
    (env.MCP_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o !== '')
  );

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }

  return {
    port: 8080,
    serviceUrl,
    tokens,
    serviceToken,
    defaultBusinessUnitKey: env.DEFAULT_BUSINESS_UNIT_KEY?.trim() || 'default',
    enableWrites: writes === 'true',
    groups,
    allowedOrigins,
    timeoutMs,
  };
}
