/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { runTool } from '../core/run';
import type { ContentoolsClient } from '../core/client';
import type { AnyToolDefinition, RequestContext } from '../core/types';

export interface McpServerOptions {
  tools: readonly AnyToolDefinition[];
  client: ContentoolsClient;
  ctx: RequestContext;
  correlationId?: string;
  onToolResult?: (e: { tool: string; ok: boolean; ms: number }) => void;
}

export function createContentoolsMcpServer(o: McpServerOptions): McpServer {
  const server = new McpServer({ name: 'contentools-mcp', version: '1.0.0' });
  for (const t of o.tools) {
    server.registerTool(
      t.name,
      {
        title: t.title,
        description: t.description,
        inputSchema: z.object(t.shape).strict(),
      },
      async (args: unknown) => {
        const started = Date.now();
        const r = await runTool(t, args, {
          client: o.client,
          ctx: o.ctx,
          correlationId: o.correlationId,
        });
        o.onToolResult?.({ tool: t.name, ok: r.ok, ms: Date.now() - started });
        return r.ok
          ? { content: [{ type: 'text' as const, text: r.text }] }
          : { isError: true, content: [{ type: 'text' as const, text: r.text }] };
      }
    );
  }
  return server;
}
