#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPES = ['puck/packages/', 'puck/playground/src/', 'admin-app/src/', 'mcp/src/'];
const BU = '\\$\\{businessUnitKey\\}';
export const ALLOW = [
  new RegExp(`^/${BU}/(?:\\$\\{mode\\}/|published/|preview/)?(?:puck-pages|puck-contents|puck-templates|configuration|upload-file|media-library|content-type/import)(?:[/?$].*)?$`),
  /^\/datasource\/.+/,
  /^\/products\/search(?:\?.*)?$/,
  /^\/health$/,
  // removed by spec K/E together with the tenant onboarding flow; keep until then:
  /^\/(?:authenticate-project|refresh-jwt)$/,
];

/** Pure: every `${baseURL}/...` / `${baseUrl}/...` path found in `text`. */
export function extractPaths(text) {
  return [...text.matchAll(/`\$\{(?:baseURL|baseUrl)\}(\/[^`]*)`/g)].map((m) => m[1]);
}

export function classify(paths) {
  return paths.map((p) => ({ path: p, ok: ALLOW.some((re) => re.test(p)) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = listFiles(ROOT).filter((p) => SCOPES.some((s) => p.startsWith(s)) && ['.ts', '.tsx'].includes(extname(p)));
  const seen = new Map(); // path -> first file
  for (const f of files) for (const p of extractPaths(readFileSync(join(ROOT, f), 'utf8'))) if (!seen.has(p)) seen.set(p, f);
  let bad = 0;
  for (const [p, f] of [...seen].sort()) {
    const ok = classify([p])[0].ok;
    if (!ok) bad++;
    console.log(`${ok ? 'OK   ' : 'FAIL '}${p.padEnd(80)} ${f}`);
  }
  console.log(`legacy-calls: ${bad ? 'FAILED' : 'OK'} (${seen.size} endpoint templates, ${bad} legacy)`);
  process.exit(bad ? 1 : 0);
}
