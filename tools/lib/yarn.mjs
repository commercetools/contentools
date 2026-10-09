/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

/**
 * Which Yarn runs scripts in `dir`. Yarn 1 apps (service, admin-app, mcp) use plain `yarn`; a directory whose
 * package.json says `packageManager: yarn@4...` (puck) must run through `corepack yarn`, with the PATH that a
 * parent Yarn 1 run injected (a temp dir whose `yarn` shim is Yarn 1) removed. Otherwise nested
 * `yarn workspaces foreach` resolves to Yarn 1 and fails with "Invalid subcommand".
 */
export function packageManagerOf(root, dir) {
  const p = join(root, dir, 'package.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')).packageManager ?? null;
}

/** Pure: remove the temp bin dirs that Yarn 1 prepends to PATH while it runs a script. */
export function cleanPath(pathValue) {
  return String(pathValue ?? '')
    .split(delimiter)
    .filter((seg) => !/[\\/]yarn--[^\\/]+(?:[\\/]|$)/.test(seg))
    .join(delimiter);
}

/** Pure: { cmd, prefix, env } for running `yarn <args>` in a directory with the given packageManager value. */
export function yarnInvocation(packageManager, env = process.env) {
  const modern = /^yarn@([2-9]|\d{2,})\./.test(packageManager ?? '');
  if (!modern) return { cmd: 'yarn', prefix: [], env };
  return { cmd: 'corepack', prefix: ['yarn'], env: { ...env, PATH: cleanPath(env.PATH) } };
}

/** Resolve `yarn <args>` for a directory of this repository: { cmd, args, env }. */
export function yarnCommand(root, dir, args, env = process.env) {
  const inv = yarnInvocation(packageManagerOf(root, dir), env);
  return { cmd: inv.cmd, args: [...inv.prefix, ...args], env: inv.env };
}

export function hasExecutable(name) {
  return spawnSync('sh', ['-c', `command -v ${name}`], { stdio: 'ignore' }).status === 0;
}
