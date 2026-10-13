#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// usage: node tools/release/tag.mjs <version | --next-rc> [--execute]
// Dry run by default. --execute creates a local annotated tag after preflight and a typed confirmation.
// This script NEVER pushes: the owner runs `git push origin <tag>` (checkpoint CP-3).
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectVersions, checkLockstep } from './versions.mjs';
import { executeGuard, nextRc, planTag } from './plan-tag.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (args) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status ?? 1, stdout: r.stdout ?? '' };
};
const fail = (msg) => { console.error(`error: ${msg}`); process.exit(1); };

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const lock = checkLockstep(collectVersions(ROOT));
  if (!lock.ok) fail(`versions are not in lockstep:\n  ${lock.problems.join('\n  ')}`);
  const wantsRc = args.includes('--next-rc');
  const given = args.find((a) => !a.startsWith('--'));
  if (!wantsRc && !given) fail('usage: node tools/release/tag.mjs <version | --next-rc> [--execute]');
  const version = wantsRc ? nextRc(lock.version, git(['tag', '-l', 'v*']).stdout.split('\n').filter(Boolean)) : given;
  const plan = planTag(version, lock.version);
  if (plan.errors.length) fail(plan.errors.join('\n'));

  for (const [c, a] of plan.commands) console.log(`${c} ${a.map((x) => (/\s/.test(x) ? JSON.stringify(x) : x)).join(' ')}`);
  for (const line of plan.displayOnly) console.log(line);
  if (!execute) { console.log('(dry run: nothing was changed; add --execute to create the local tag)'); return; }

  const guard = executeGuard(plan.tag, git);
  if (guard) fail(guard);
  const pre = spawnSync(process.execPath, [resolve(ROOT, 'tools/release/preflight.mjs')], { cwd: ROOT, stdio: 'inherit' });
  if (pre.status !== 0) fail('preflight failed');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type the tag name (${plan.tag}) to create it: `);
  rl.close();
  if (answer.trim() !== plan.tag) fail('confirmation did not match; nothing created');
  const [c, a] = plan.commands[0];
  const r = spawnSync(c, a, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) fail('git tag failed');
  console.log(`created local tag ${plan.tag}. Not pushed: the owner runs: git push origin ${plan.tag}`);
}

main();
