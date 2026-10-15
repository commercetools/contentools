#!/usr/bin/env node
// Release preflight: strict verify, lockstep versions, dist-tag, clean git tree. Publishes nothing.
//   node tools/release/preflight.mjs [--skip-verify]   (--skip-verify exists for tests and drift checks only)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLockstep, collectVersions, distTag } from './versions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = false;
const bad = (msg) => { console.error(msg); failed = true; };

const lock = checkLockstep(collectVersions(ROOT));
if (!lock.ok) bad(`versions are not in lockstep:\n  ${lock.problems.join('\n  ')}`);

if (!process.argv.includes('--skip-verify')) {
  const v = spawnSync(process.execPath, [join(ROOT, 'tools/verify.mjs'), '--strict'], { cwd: ROOT, stdio: 'inherit' });
  if (v.status !== 0) bad('strict verify failed');
}

if (lock.ok) {
  console.log(`release version: ${lock.version}`);
  console.log(`dist-tag: ${distTag(lock.version)}`);
  console.log(`tag: v${lock.version}`);
}

if (existsSync(join(ROOT, '.git'))) {
  const st = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (st.stdout.trim() !== '') bad('git tree is not clean');
  const br = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  console.log(`branch: ${br.stdout.trim()}`);
} else {
  console.log('warning: not a git repository (R creates the release repository)');
}

if (failed) { console.error('preflight: FAILED'); process.exit(1); }
console.log('preflight: OK');
