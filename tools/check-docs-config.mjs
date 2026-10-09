#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Keeps the configuration tables of the documentation in step with connect.yaml.
// Zero dependencies: connect.yaml lists its keys as `- key: NAME` lines, which is all this reads.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TABLE_FILES = ['INSTALL.md', 'service/README.md', 'admin-app/README.md', 'mcp/README.md'];

/** Variables that are documented but not declared in connect.yaml: injected by Connect or local-development only. */
export const INJECTED = [
  'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_SCOPE', 'CTP_PROJECT_KEY', 'CTP_API_URL', 'CTP_AUTH_URL', 'CTP_REGION',
  'CONNECT_SERVICE_URL', 'APPLICATION_URL', 'CTP_INITIAL_PROJECT_KEY', 'PORT', 'NODE_ENV',
];

/** Pure: every configuration key declared in connect.yaml text. */
export function manifestKeys(yamlText) {
  return new Set([...yamlText.matchAll(/^\s*-\s+key:\s*["']?([A-Z][A-Z0-9_]*)["']?\s*$/gm)].map((m) => m[1]));
}

/** Pure: first-column keys (backticked UPPER_SNAKE) of the markdown tables of one document, with line numbers. */
export function tableKeys(markdown) {
  const out = [];
  markdown.split('\n').forEach((line, i) => {
    const m = /^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|/.exec(line);
    if (m) out.push({ key: m[1], line: i + 1 });
  });
  return out;
}

/** Pure: problems for a manifest key set and a map of file -> table keys. */
export function check(manifest, tables, injected = INJECTED) {
  const problems = [];
  const documented = new Set(Object.values(tables).flat().map((t) => t.key));
  for (const key of [...manifest].sort()) {
    if (!documented.has(key)) problems.push(`connect.yaml key ${key} is in no documentation table`);
  }
  for (const [file, keys] of Object.entries(tables)) {
    for (const { key, line } of keys) {
      if (!manifest.has(key) && !injected.includes(key)) {
        problems.push(`${file}:${line}: ${key} is neither in connect.yaml nor an injected variable`);
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = manifestKeys(readFileSync(join(ROOT, 'connect.yaml'), 'utf8'));
  const tables = Object.fromEntries(TABLE_FILES.map((f) => [f, tableKeys(readFileSync(join(ROOT, f), 'utf8'))]));
  const problems = check(manifest, tables);
  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log(`docs config ok (${manifest.size} keys)`);
}
