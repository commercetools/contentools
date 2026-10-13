#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Directory holding ossify.mjs/gate.mjs (the tools are not part of this repository), or null. Set `LABS_PUBLISH_DIR`. */
export function findScriptsDir(env = process.env) {
  const dir = env.LABS_PUBLISH_DIR;
  return dir && existsSync(join(dir, 'ossify.mjs')) ? dir : null;
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
