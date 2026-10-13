/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Every package.json that carries the release version: root, puck packages, service, admin-app, mcp. */
export function versionFiles(root) {
  const files = ['package.json', 'service/package.json', 'admin-app/package.json', 'mcp/package.json'];
  const pk = join(root, 'puck/packages');
  if (existsSync(pk)) for (const d of readdirSync(pk).sort()) files.push(`puck/packages/${d}/package.json`);
  return files.filter((f) => existsSync(join(root, f)));
}

export function collectVersions(root) {
  return versionFiles(root).map((f) => ({ file: f, version: JSON.parse(readFileSync(join(root, f), 'utf8')).version }));
}

/** { ok, version, problems[] } - lockstep + semver. */
export function checkLockstep(entries) {
  const problems = [];
  const versions = new Set(entries.map((e) => e.version));
  for (const e of entries) if (!SEMVER.test(String(e.version))) problems.push(`${e.file}: invalid version "${e.version}"`);
  if (versions.size > 1) for (const e of entries) problems.push(`${e.file}: ${e.version}`);
  return { ok: problems.length === 0, version: [...versions][0], problems };
}

export const distTag = (version) => (version.includes('-') ? 'next' : 'latest');
