/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Checks the publishable metadata of every package under puck/packages:
// names, lockstep version, license, repository fields, files, exports,
// workspace ranges, README banner and undeclared imports. Also checks that
// every `puck/...` path mentioned in docs/api-contracts.json exists.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '..');
const PKG_DIR = join(root, 'packages');
const anyVersion = process.argv.includes('--any-version');
const errors = [];
const pkgs = readdirSync(PKG_DIR).filter((d) => existsSync(join(PKG_DIR, d, 'package.json')));
const versions = new Set();
const names = [];

const listSources = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name));

for (const d of pkgs) {
  const pj = JSON.parse(readFileSync(join(PKG_DIR, d, 'package.json'), 'utf8'));
  names.push(pj.name);
  versions.add(pj.version);
  const expect = `@commercetools-labs/${d}`;
  if (pj.name !== expect) errors.push(`${d}: name ${pj.name} != ${expect}`);
  if (!/^1\.0\.0(-rc\.\d+)?$/.test(pj.version) && !anyVersion) errors.push(`${d}: version ${pj.version}`);
  if (pj.license !== 'MIT') errors.push(`${d}: license`);
  if (pj.repository?.directory !== `puck/packages/${d}`) errors.push(`${d}: repository.directory`);
  if (!pj.bugs?.url || !pj.homepage) errors.push(`${d}: bugs/homepage`);
  if (pj.publishConfig?.access !== 'public') errors.push(`${d}: publishConfig.access`);
  if (JSON.stringify(pj.files) !== JSON.stringify(['dist', 'README.md'])) errors.push(`${d}: files`);
  if (pj.engines?.node !== '>=22') errors.push(`${d}: engines.node`);
  if (/c[m]s/i.test(pj.description ?? '')) errors.push(`${d}: description mentions the retired product name`);
  if (existsSync(join(PKG_DIR, d, 'LICENSE'))) errors.push(`${d}: LICENSE must not be committed in the package dir (copied at pack time)`);
  if (pj.sideEffects === false) errors.push(`${d}: sideEffects false is forbidden`);
  const exp = pj.exports?.['.'];
  if (exp?.import?.types !== './dist/index.d.mts' || exp?.require?.types !== './dist/index.d.ts') errors.push(`${d}: exports types`);
  const readme = join(PKG_DIR, d, 'README.md');
  if (!existsSync(readme)) errors.push(`${d}: missing README.md`);
  else if (!/unsupported/i.test(readFileSync(readme, 'utf8'))) errors.push(`${d}: README lacks the unsupported banner`);
  for (const [dep, range] of Object.entries(pj.dependencies ?? {})) {
    if (dep.startsWith('@commercetools-labs/') && range !== 'workspace:^') errors.push(`${d}: ${dep} must be workspace:^`);
  }
  const declared = new Set([
    ...Object.keys(pj.dependencies ?? {}),
    ...Object.keys(pj.peerDependencies ?? {}),
    ...Object.keys(pj.devDependencies ?? {}),
  ]);
  const used = new Set();
  const srcDir = join(PKG_DIR, d, 'src');
  if (existsSync(srcDir)) {
    for (const f of listSources(srcDir)) {
      const text = readFileSync(f, 'utf8');
      // Statement-level imports/re-exports only, so comments and strings are ignored.
      for (const m of text.matchAll(/^(?:import|export)\s(?:[^;'"]*?\sfrom\s*|\s*)['"]([^'"./][^'"]*)['"]/gm)) {
        const parts = m[1].split('/');
        const name = m[1].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
        if (!name.startsWith('node:')) used.add(name);
      }
    }
  }
  for (const u of used) if (!declared.has(u)) errors.push(`${d}: undeclared import ${u}`);
}
if (versions.size > 1) errors.push(`versions differ: ${[...versions].join(', ')}`);

const contractsFile = join(root, 'docs', 'api-contracts.json');
if (existsSync(contractsFile)) {
  const text = readFileSync(contractsFile, 'utf8');
  try {
    JSON.parse(text);
  } catch (e) {
    errors.push(`docs/api-contracts.json: invalid JSON (${e.message})`);
  }
  if (/"compatible":\s*false/.test(text)) errors.push('docs/api-contracts.json: contains compatible:false');
  for (const m of text.matchAll(/"file":\s*"(puck\/[^"]+?)(?::\d+)?"/g)) {
    if (!existsSync(join(repoRoot, m[1]))) errors.push(`docs/api-contracts.json: missing file ${m[1]}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`${pkgs.length} packages OK`);
for (const n of names.sort()) console.log(`${n}@${[...versions][0]}`);
