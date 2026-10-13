#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Runs a puck script (release:bump, release:publish) with the right Yarn: puck is Yarn 4 (corepack) while the
// root runs under Yarn 1, whose injected PATH would otherwise hand the nested yarn calls to Yarn 1.
//   node tools/release/puck-script.mjs <script> [args...]     e.g. release:publish --execute
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { yarnCommand } from '../lib/yarn.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [script, ...rest] = process.argv.slice(2);
if (!script) {
  console.error('usage: node tools/release/puck-script.mjs <script> [args...]');
  process.exit(2);
}
const c = yarnCommand(ROOT, 'puck', ['run', script, ...rest]);
const r = spawnSync(c.cmd, c.args, { cwd: join(ROOT, 'puck'), env: c.env, stdio: 'inherit' });
process.exit(r.status ?? 1);
