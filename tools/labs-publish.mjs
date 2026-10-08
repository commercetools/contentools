#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_REL = 'skills/commercetools-labs-publish/scripts';

const cmpVersion = (a, b) => a.split('.').map(Number).reduce((r, n, i) => r || n - (Number(b.split('.')[i]) || 0), 0);

/** Directory holding ossify.mjs/gate.mjs, or null. `LABS_PUBLISH_DIR` wins over the plugin cache lookup. */
export function findScriptsDir(env = process.env, home = homedir()) {
  if (env.LABS_PUBLISH_DIR) return existsSync(join(env.LABS_PUBLISH_DIR, 'ossify.mjs')) ? env.LABS_PUBLISH_DIR : null;
  const base = join(home, '.claude/plugins/cache/presales-plugin/presales');
  if (!existsSync(base)) return null;
  for (const v of readdirSync(base).sort(cmpVersion).reverse()) {
    const dir = join(base, v, SKILL_REL);
    if (existsSync(join(dir, 'ossify.mjs'))) return dir;
  }
  return null;
}

/** Pure: argv for `node`. ossify gets --year 2026 unless given; nothing else is added (no --apply by default). */
export function buildArgs(sub, extra, dir, root = ROOT) {
  if (!['ossify', 'gate'].includes(sub)) throw new Error(`unknown subcommand "${sub}" (use ossify|gate)`);
  const args = [join(dir, `${sub}.mjs`), '--repo', root, ...extra];
  if (sub === 'ossify' && !extra.includes('--year')) args.push('--year', '2026');
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sub, ...extra] = process.argv.slice(2);
  const dir = findScriptsDir();
  if (!dir) { console.error('labs-publish: skill scripts not found. Set LABS_PUBLISH_DIR to the folder containing ossify.mjs and gate.mjs.'); process.exit(2); }
  let args;
  try { args = buildArgs(sub, extra, dir); } catch (e) { console.error(`labs-publish: ${e.message}`); process.exit(2); }
  process.exit(spawnSync('node', args, { stdio: 'inherit' }).status ?? 1);
}
