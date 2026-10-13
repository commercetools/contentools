/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
// Local, confirmation-gated publish of @commercetools-labs/contentools-mcp.
//   node scripts/publish.mjs                  dry run (default): everything except the real publish
//   node scripts/publish.mjs --publish        real publish (needs `npm login`, typed confirmation, OTP)
//   node scripts/publish.mjs --tag <t>        override the dist-tag (default: prerelease -> next, else latest)
// There is no CI: a person runs this. Never put an npm token in a file; use `npm login`.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { assembleManifest, tagFor } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.publish');
const argv = process.argv.slice(2);
const real = argv.includes('--publish');
const tagFlag = argv.indexOf('--tag');
const tagOverride = tagFlag >= 0 ? argv[tagFlag + 1] : undefined;

function header(n, text) {
  console.log(`\n[${n}] ${text}`);
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function shInherit(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p)];
  });
}

async function main() {
  header(1, 'preconditions');
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 22) throw new Error(`Node >= 22 required, found ${process.versions.node}`);
  if (path.basename(root) !== 'mcp') throw new Error('this script must live in the mcp/ folder');

  header(2, real ? 'npm whoami' : 'npm whoami (skipped in dry run)');
  if (real) {
    try {
      console.log(`logged in as ${sh('npm', ['whoami']).trim()}`);
    } catch {
      throw new Error('not logged in: run `npm login` (the owner account with publish rights on @commercetools-labs)');
    }
  }

  header(3, 'yarn check:app and yarn build:npm');
  shInherit('yarn', ['check:app']);
  shInherit('yarn', ['build:npm']);

  header(4, 'assemble .publish/');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const template = JSON.parse(fs.readFileSync(path.join(root, 'publish', 'package.template.json'), 'utf8'));
  const license = path.join(root, '..', 'LICENSE');
  if (!fs.existsSync(license)) throw new Error('LICENSE not found at the repository root');
  const manifest = assembleManifest(template, pkg);
  for (const target of Object.values(manifest.bin ?? {})) {
    if (!fs.existsSync(path.join(root, target))) throw new Error(`bin target missing: ${target}`);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out);
  fs.cpSync(path.join(root, 'dist'), path.join(out, 'dist'), { recursive: true });
  fs.copyFileSync(path.join(root, 'publish', 'README.md'), path.join(out, 'README.md'));
  fs.copyFileSync(license, path.join(out, 'LICENSE'));
  fs.writeFileSync(path.join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const files = walk(out).sort();
  console.log(`${manifest.name}@${manifest.version}: ${files.length} files`);

  header(5, 'verify package');
  shInherit(process.execPath, ['scripts/verify-package.mjs', '--dir', '.publish']);

  header(6, 'registry check');
  const spec = `${manifest.name}@${manifest.version}`;
  try {
    const found = sh('npm', ['view', spec, 'version']).trim();
    if (found) throw new Error(`${spec} is already published; bump the version in package.json`);
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    if (e.status === undefined) throw e; // our own "already published" error
    if (!/E404/.test(text)) throw new Error(`could not query the registry (not a 404):\n${text.slice(-500)}`);
    console.log(`${spec} does not exist yet (E404): good`);
  }

  header(7, 'dist-tag');
  const tag = tagOverride ?? tagFor(manifest.version);
  console.log(`tag: ${tag}`);

  header(8, real ? 'publish' : 'npm publish --dry-run');
  if (!real) {
    shInherit('npm', ['publish', './.publish', '--access', 'public', '--tag', tag, '--dry-run']);
    console.log('\nDRY RUN OK; re-run with --publish');
    return;
  }
  console.log(`package: ${manifest.name}\nversion: ${manifest.version}\ntag: ${tag}\nfiles: ${files.length}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type "publish ${spec}" to continue: `);
  rl.close();
  if (answer.trim() !== `publish ${spec}`) throw new Error('confirmation did not match; nothing published');
  // stdio inherited so npm can ask for the one-time password.
  shInherit('npm', ['publish', './.publish', '--access', 'public', '--tag', tag]);
  console.log(`\nPublished ${spec} with tag ${tag}`);
}

main().catch((e) => {
  console.error(`\nABORTED: ${e.message}`);
  process.exit(1);
});
