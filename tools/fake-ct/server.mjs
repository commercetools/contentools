#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Standalone fake commercetools API (token + custom objects + product search), in memory, zero dependencies.
// Run with: node --experimental-strip-types tools/fake-ct/server.mjs   (or `yarn dev:fake-ct`)
import { createServer } from 'node:http';
import { createStore, route } from '../../service/tests/support/fake-ct-store.ts';

const store = createStore();
const port = Number(process.env.FAKE_CT_PORT ?? 8099);

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let raw = '';
  for await (const c of req) raw += c;
  let body;
  try {
    // /oauth/token carries a form body; only JSON is parsed.
    body = raw && req.headers['content-type']?.includes('json') ? JSON.parse(raw) : undefined;
  } catch {
    body = undefined;
  }
  const r = route(store, req.method, url.pathname, url.searchParams, body);
  res.writeHead(r.status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(r.body));
}).listen(port, () => console.log(`fake-ct listening on :${port}`));
