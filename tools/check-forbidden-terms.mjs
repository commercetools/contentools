#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Patterns are assembled from fragments so this file never matches itself.
const f = (...p) => new RegExp(p.join(''), 'i');
export const TERMS = [
  { id: 'cms', re: f('c', 'ms') },
  { id: 'de' + 'mo', re: f('\\bde', 'mos?\\b|commercetools-', 'de', 'mo') },
  { id: 'ct-' + 'po' + 'c', re: f('ct-', 'po', 'c|\\bpo', 'c\\b|pre-?', 'sales') },
  { id: 'multitenant', re: f('multi-?', 'tenant') },
  { id: 'contenttools', re: f('content', 'tools') },
  { id: 'hosting', re: f('\\.run', '\\.app|cloud\\s?run|gcloud') },
  { id: 'internal', re: f('seller', 'tools|frontend\\.', 'site') },
  { id: 'firestore', re: f('fire', 'store') },
  { id: 'tenant-api', re: new RegExp('x-project-key|authenticate-project|refresh-jwt|validate' + 'Project|' + 'X-Project-Key', 'i') },
];
// NOTE: `contenttools` must not match "Content Tools" (with space): the pattern has no space.

const SKIP_PREFIX = [
  'openspec/', 'plans/', '.claude/', 'tools/check-forbidden-terms.mjs', 'tools/test/check-forbidden-terms.test.mjs',
  // Tooling that must name the things it polices or locate the external publish plugin on disk:
  'tools/forbidden-pending.txt', 'tools/forbidden-allow.txt',
  'tools/check-legacy-route-calls.mjs', 'tools/labs-publish.mjs', 'tools/test/labs-publish.test.mjs',
];
const SKIP_FILE = [/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/, /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip|tgz|svg)$/i];

const readList = (p) => (existsSync(p) ? readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean) : []);

/** Pure: hits for a file or folder NAME (every path segment is checked). Line 0 marks a path hit. */
export function scanPath(path) {
  return TERMS.filter((t) => t.re.test(path)).map((t) => ({ path, line: 0, term: t.id, text: '(path name)' }));
}

/** Pure: hits for one file's text. */
export function scanText(path, text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const t of TERMS) if (t.re.test(line)) hits.push({ path, line: i + 1, term: t.id, text: line.trim().slice(0, 140) });
  });
  return hits;
}

const matches = (entry, path) => (entry.endsWith('/') ? path.startsWith(entry) : path === entry);
const inPending = (path, pending) => pending.some((p) => matches(p, path));

/** Pure decision: returns { failures: string[], tolerated: number } */
export function evaluate(hits, pending, allow, existing) {
  const failures = [];
  let tolerated = 0;
  const allowed = new Set(allow.map((l) => l.replace(/\s+/g, ' ')));
  const withHits = new Set();
  for (const h of hits) {
    if (allowed.has(`${h.path} ${h.term}`)) continue;
    withHits.add(h.path);
    if (inPending(h.path, pending)) { tolerated++; continue; }
    failures.push(`${h.path}:${h.line}: [${h.term}] ${h.text}`);
  }
  for (const p of pending) {
    const anyHit = [...withHits].some((w) => matches(p, w));
    if (!anyHit) failures.push(`stale pending entry: ${p}${existing.has(p) || p.endsWith('/') ? '' : ' (file missing)'}`);
  }
  return { failures, tolerated };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const files = listFiles(ROOT).filter((p) => !SKIP_PREFIX.some((s) => p.startsWith(s)) && !SKIP_FILE.some((re) => re.test(p)));
  const hits = files.flatMap((p) => [...scanPath(p), ...scanText(p, readFileSync(join(ROOT, p), 'utf8'))]);
  const pending = args.includes('--no-pending') ? [] : readList(join(ROOT, 'tools/forbidden-pending.txt'));
  if (args.includes('--require-empty-pending') && pending.length) {
    console.error('forbidden-terms: pending list must be empty in strict mode (' + pending.length + ' entries)');
    process.exit(1);
  }
  const allow = readList(join(ROOT, 'tools/forbidden-allow.txt'));
  if (args.includes('--list')) { // counts per file, for baselines
    const by = new Map();
    for (const h of hits) by.set(h.path, (by.get(h.path) ?? 0) + 1);
    for (const [p, n] of [...by].sort()) console.log(`${String(n).padStart(4)}  ${p}`);
    console.log(`total files: ${by.size}, hits: ${hits.length}`);
    process.exit(0);
  }
  const { failures, tolerated } = evaluate(hits, pending, allow, new Set(files));
  if (failures.length) { console.error(failures.join('\n') + `\nforbidden-terms: FAILED (${failures.length})`); process.exit(1); }
  console.log(`forbidden-terms: OK (${hits.length - tolerated} hits, ${pending.length} pending)`);
}
