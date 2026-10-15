#!/usr/bin/env node
// Documentation lint. Zero dependencies. Prints `file:line: message` and exits 1 on any problem.
//   (a) README.md lines 1-10 carry UNSUPPORTED, SUPPORT.md and LICENSE
//   (b) no forbidden wording in any markdown file (allow list: tools/docs-lint-allow.json)
//   (c) relative markdown links resolve
//   (d) every backticked repository path in FEATURES.md exists
//   (e) the peer list of each puck package README equals peerDependencies of its package.json
//   (f) every puck package README says UNSUPPORTED; README, puck/README and FEATURES say "machine-translated"

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Assembled from fragments so this file never matches the repository's own forbidden-word guard.
const f = (...p) => new RegExp(p.join(''), 'i');
export const FORBIDDEN = [
  { id: 'legacy-name', re: f('\\bc', 'ms\\b') },
  { id: 'tenancy', re: f('multi-?', 'tenan') },
  { id: 'old-database', re: f('fire', 'store') },
  { id: 'old-hosting', re: f('cloud\\s?', 'run\\b') },
  { id: 'showcase-word', re: f('\\bde', 'mos?\\b') },
  { id: 'proof-word', re: f('\\bP', 'OC\\b') },
  { id: 'sales-word', re: f('pre-?', 'sales') },
  { id: 'old-auth', re: f('x-project', '-key|authenticate-', 'project') },
];

const SKIP_PREFIX = ['openspec/', 'plans/', '.claude/'];

/** Pure: lines of a markdown text outside fenced code blocks, with 1-based numbers. */
export function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return; }
    out.push({ n: i + 1, line, fenced });
  });
  return out;
}

/** Pure: forbidden-word hits for one markdown file (code blocks included: wording rules apply everywhere). */
export function forbiddenHits(file, text, allow = []) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const { id, re } of FORBIDDEN) {
      if (!re.test(line)) continue;
      if (allow.some((a) => a.file === file && new RegExp(a.pattern, 'i').test(line))) continue;
      hits.push(`${file}:${i + 1}: forbidden wording [${id}]`);
    }
  });
  return hits;
}

/** Pure: relative link targets of a markdown text (outside code blocks), with line numbers. */
export function relativeLinks(text) {
  const out = [];
  for (const { n, line, fenced } of proseLines(text)) {
    if (fenced) continue;
    for (const m of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[1];
      if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
      out.push({ n, target: target.replace(/#.*$/, '').replace(/\?.*$/, '') });
    }
  }
  return out.filter((l) => l.target !== '');
}

/** Pure: backticked repository paths of FEATURES.md. */
export function featurePaths(text) {
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1])
    .filter((p) => /^(service|admin-app|mcp|puck|docs|tools)\//.test(p) && !/[\s*<>:]/.test(p));
}

/** Pure: package names listed under "## Peer dependencies" of a package README ('None.' means none). */
export function readmePeers(text) {
  const start = text.indexOf('## Peer dependencies');
  if (start < 0) return null;
  const rest = text.slice(start + '## Peer dependencies'.length);
  const section = rest.split(/\n## |\n(?=Part of )/)[0];
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]).sort();
}

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export function lint() {
  const problems = [];
  const allow = existsSync(join(ROOT, 'tools/docs-lint-allow.json')) ? JSON.parse(read('tools/docs-lint-allow.json')) : [];
  const files = listFiles(ROOT).filter((p) => p.endsWith('.md') && !SKIP_PREFIX.some((s) => p.startsWith(s)));

  // (a)
  const head = read('README.md').split('\n').slice(0, 10).join('\n');
  for (const word of ['UNSUPPORTED', 'SUPPORT.md', 'LICENSE']) {
    if (!head.includes(word)) problems.push(`README.md:1: the first 10 lines must mention ${word}`);
  }

  for (const file of files) {
    const text = read(file);
    // (b)
    problems.push(...forbiddenHits(file, text, allow));
    // (c)
    for (const { n, target } of relativeLinks(text)) {
      if (!existsSync(resolve(ROOT, dirname(file), target))) problems.push(`${file}:${n}: broken link ${target}`);
    }
  }

  // (d)
  if (existsSync(join(ROOT, 'FEATURES.md'))) {
    for (const p of featurePaths(read('FEATURES.md'))) {
      if (!existsSync(join(ROOT, p))) problems.push(`FEATURES.md:1: path does not exist: ${p}`);
    }
  } else problems.push('FEATURES.md:1: file is missing');

  // (e), (f)
  const pkgDir = join(ROOT, 'puck/packages');
  for (const name of readdirSync(pkgDir).sort()) {
    const readme = `puck/packages/${name}/README.md`;
    if (!existsSync(join(ROOT, readme))) { problems.push(`${readme}:1: missing`); continue; }
    const text = read(readme);
    if (!text.includes('UNSUPPORTED')) problems.push(`${readme}:1: must say UNSUPPORTED`);
    const declared = Object.keys(JSON.parse(read(`puck/packages/${name}/package.json`)).peerDependencies ?? {}).sort();
    const listed = readmePeers(text);
    if (listed === null) problems.push(`${readme}:1: no "## Peer dependencies" section`);
    else if (JSON.stringify(listed) !== JSON.stringify(declared)) {
      problems.push(`${readme}:1: peer dependencies differ from package.json (README: ${listed.join(', ') || 'none'}; package.json: ${declared.join(', ') || 'none'})`);
    }
  }
  for (const p of ['README.md', 'puck/README.md', 'FEATURES.md']) {
    if (!existsSync(join(ROOT, p)) || !read(p).includes('machine-translated')) problems.push(`${p}:1: must say that the German catalogs are machine-translated`);
  }
  return { problems, files: files.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, files } = lint();
  if (problems.length) {
    for (const p of problems) console.error(p);
    process.exit(1);
  }
  console.log(`docs lint ok (${files} files)`);
}
