/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import {
  ContentoolsClient,
  selectTools,
  runTool,
  type AnyToolDefinition,
  type ToolGroup,
} from '../core';

export interface AdapterOptions {
  /** Content service base URL, ending in /service. */
  baseUrl: string;
  /** Bearer token for the content service (SERVICE_API_TOKEN equivalent). */
  token: string;
  defaultBusinessUnitKey?: string;
  groups?: 'all' | ToolGroup[];
  /** Default false: only the 24 read tools are exposed. */
  enableWrites?: boolean;
  timeoutMs?: number;
  /** Injection point for tests and proxies. */
  fetch?: typeof fetch;
}

export interface Toolset {
  tools: AnyToolDefinition[];
  run(tool: AnyToolDefinition, args: unknown): Promise<string>;
}

export function buildToolset(o: AdapterOptions): Toolset {
  if (!o.baseUrl || !/^https?:\/\//.test(o.baseUrl)) {
    throw new Error('baseUrl must be an http(s) URL ending in /service');
  }
  if (!o.token) throw new Error('token is required');
  const client = new ContentoolsClient({
    baseUrl: o.baseUrl,
    token: o.token,
    timeoutMs: o.timeoutMs ?? 15000,
    ...(o.fetch ? { fetchImpl: o.fetch } : {}),
  });
  const ctx = { defaultBusinessUnitKey: o.defaultBusinessUnitKey ?? 'default' };
  return {
    tools: selectTools({ groups: o.groups ?? 'all', enableWrites: o.enableWrites ?? false }),
    run: async (tool, args) => (await runTool(tool, args, { client, ctx })).text,
  };
}
