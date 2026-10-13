/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Develop admin-app against the puck packages in this repository before they are published to npm.
//
//   node tools/admin-app-use-local-puck.mjs            build puck, pack every package, install the tarballs
//   node tools/admin-app-use-local-puck.mjs --restore  put the original package.json back and reinstall
//   add --ignore-engines when the local Node is older than a dependency's engines range
//
// The committed admin-app/package.json always uses registry versions. This script rewrites it
// temporarily (`resolutions` -> `file:` tarballs) and installs WITHOUT reading or writing yarn.lock.
// Run it from anywhere; never commit while it is active (admin-app `yarn check:pins` fails on purpose).

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const puckDir = join(root, 'puck');
const appDir = join(root, 'admin-app');
const localDir = join(appDir, '.local-puck');
const pkgPath = join(appDir, 'package.json');
const origPath = join(localDir, 'package.json.orig');

/** puck is the only Yarn 4 project: always go through corepack so the pinned Yarn runs. */
const puckYarn = (args) =>
  execFileSync('corepack', ['yarn', ...args], { cwd: puckDir, stdio: 'inherit' });
/** admin-app is Yarn 1 classic. Run it from its own directory. */
const ignoreEngines = process.argv.includes('--ignore-engines') ? ['--ignore-engines'] : [];
const appYarn = (args) =>
  execFileSync('yarn', args, { cwd: appDir, stdio: 'inherit' });

const tarballName = (name) => `${name.replace(/^@/, '').replace('/', '-')}.tgz`;

const restore = () => {
  if (existsSync(origPath)) copyFileSync(origPath, pkgPath);
  rmSync(localDir, { recursive: true, force: true });
  try {
    appYarn(['install', '--frozen-lockfile', ...ignoreEngines]);
  } catch {
    // Before the first puck release exists on npm, the committed yarn.lock has no puck entries and
    // the registry has no puck packages, so this install cannot succeed yet. package.json is restored.
    console.warn('warning: registry install failed (is the puck pre-release published and locked?)');
  }
  console.log('restored');
};

const use = () => {
  puckYarn(['build']);
  // Keep the pristine package.json from the first run: a re-run must not save the rewritten one.
  const original = existsSync(origPath) ? readFileSync(origPath) : readFileSync(pkgPath);
  rmSync(localDir, { recursive: true, force: true });
  mkdirSync(localDir, { recursive: true });
  puckYarn([
    'workspaces',
    'foreach',
    '--all',
    '--no-private',
    'pack',
    '--out',
    join(localDir, '%s.tgz'),
  ]);
  // Yarn 4 names them `@commercetools-labs-contentools-api.tgz`; a leading `@` in a file: path confuses Yarn 1.
  for (const file of readdirSync(localDir)) {
    if (file.startsWith('@')) renameSync(join(localDir, file), join(localDir, file.slice(1)));
  }

  writeFileSync(origPath, original);
  const pkg = JSON.parse(readFileSync(origPath, 'utf8'));
  const names = [];
  for (const dir of readdirSync(join(puckDir, 'packages'))) {
    const manifest = join(puckDir, 'packages', dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name, private: isPrivate } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (!isPrivate && name) names.push(name);
  }
  pkg.resolutions = { ...(pkg.resolutions ?? {}) };
  for (const name of names) {
    const file = tarballName(name);
    if (!existsSync(join(localDir, file))) {
      throw new Error(`missing tarball ${file} for ${name}`);
    }
    pkg.resolutions[name] = `file:./.local-puck/${file}`;
    // Yarn 1 does not apply `resolutions` to direct dependencies of the root: rewrite those too.
    if (pkg.dependencies?.[name]) pkg.dependencies[name] = `file:./.local-puck/${file}`;
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // Yarn 1 caches file: tarballs by name; a rebuilt tarball with the same version would be ignored.
  for (const name of names) {
    try {
      execFileSync('yarn', ['cache', 'clean', name], { cwd: appDir, stdio: 'ignore' });
    } catch {
      /* nothing cached yet */
    }
  }
  appYarn(['install', '--force', '--no-lockfile', ...ignoreEngines]);

  for (const name of names) {
    const installed = join(appDir, 'node_modules', name, 'package.json');
    if (existsSync(installed)) {
      console.log(`${name}@${JSON.parse(readFileSync(installed, 'utf8')).version} (local tarball)`);
    }
  }
  console.log('run with --restore before committing');
};

if (process.argv.includes('--restore')) restore();
else use();
