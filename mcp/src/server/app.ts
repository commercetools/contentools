/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { selectTools } from '../core/registry';
import type { ContentoolsClient } from '../core/client';
import { createContentoolsMcpServer } from '../mcp/server';
import { makeBearerMatcher } from './auth';
import type { Config } from './config';
import { log } from './logger';

export interface AppDeps {
  config: Config;
  client: ContentoolsClient;
}

const rpcError = (code: number, message: string) => ({
  jsonrpc: '2.0',
  error: { code, message },
  id: null,
});

export function buildApp({ config, client }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/mcp/status', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const isAuthorized = makeBearerMatcher(config.tokens);
  const gate: RequestHandler = (req, res, next) => {
    if (req.path !== '/') return next();
    if (req.method !== 'POST') {
      res.status(405).set('Allow', 'POST').json(rpcError(-32000, 'Method not allowed'));
      return;
    }
    const origin = req.header('origin');
    if (origin !== undefined && !config.allowedOrigins.has(origin)) {
      res.status(403).json(rpcError(-32000, 'Origin not allowed'));
      return;
    }
    if (!isAuthorized(req.header('authorization'))) {
      res
        .status(401)
        .set('WWW-Authenticate', 'Bearer realm="contentools-mcp"')
        .json(rpcError(-32001, 'Unauthorized'));
      return;
    }
    next();
  };
  // Auth runs before body parsing so unauthenticated callers cannot make the server buffer 8 MB.
  app.use('/mcp', gate);

  const tools = selectTools({ groups: config.groups, enableWrites: config.enableWrites });
  const ctx = { defaultBusinessUnitKey: config.defaultBusinessUnitKey };

  app.post('/mcp', express.json({ limit: '8mb' }), async (req, res, next) => {
    const started = Date.now();
    const correlationId = randomUUID();
    try {
      const server = createContentoolsMcpServer({
        tools,
        client,
        ctx,
        correlationId,
        onToolResult: (e) =>
          log({
            msg: 'mcp.tool',
            tool: e.tool,
            outcome: e.ok ? 'ok' : 'error',
            ms: e.ms,
            correlationId,
          }),
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        void transport.close();
        void server.close();
        const method = (req.body as { method?: unknown } | undefined)?.method;
        log({
          msg: 'mcp.request',
          correlationId,
          method: typeof method === 'string' ? method : undefined,
          ms: Date.now() - started,
        });
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      (e as { correlationId?: string }).correlationId = correlationId;
      next(e);
    }
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json(rpcError(-32700, 'Parse error'));
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json(rpcError(-32600, 'Request too large'));
      return;
    }
    log({
      msg: 'mcp.error',
      correlationId: (err as { correlationId?: string }).correlationId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    if (err instanceof Error && err.stack) process.stderr.write(`${err.stack}\n`);
    if (res.headersSent) return;
    res.status(500).json(rpcError(-32603, 'Internal server error'));
  };
  app.use(onError);

  return app;
}
