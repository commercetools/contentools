#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Static (no Docker) checks of the root connect.yaml and the app folders.
// `commercetools connect validate .` stays the authority; `yarn verify --connect` runs it.
//   node tools/check-connect-contract.mjs [<repo root>]

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConnectYaml, scopesOf } from './lib/connect-blocks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CTP_KEYS = new Set(['CTP_PROJECT_KEY', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_SCOPE', 'CTP_API_URL', 'CTP_AUTH_URL']);
const SECRET_LIKE = /(SECRET|TOKEN|PRIVATE_KEY|PASSWORD|API_KEY)/;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Returns [{ n, msg }]. `root` is the repository root holding connect.yaml and the app folders. */
export function checkContract(root) {
  const problems = [];
  const add = (n, msg) => problems.push({ n, msg });
  const file = join(root, 'connect.yaml');
  if (!existsSync(file)) return [{ n: 0, msg: 'connect.yaml missing' }];
  const { apps, inherit, inheritCount } = parseConnectYaml(readFileSync(file, 'utf8'));
  if (apps.length === 0) add(1, 'no apps found under deployAs (expected two-space indented "  - name:" entries)');

  for (const app of apps) {
    const pkgPath = join(root, app.name, 'package.json');
    const hasPkg = existsSync(pkgPath);
    if (!hasPkg) add(app.start, `app folder missing: ${app.name}`);

    if (!['service', 'merchant-center-custom-application'].includes(app.applicationType)) add(app.start, `unsupported applicationType: ${app.applicationType}`);
    if (app.applicationType === 'service') {
      const want = app.name === 'mcp' ? '/mcp' : '/service';
      if (!app.endpoint) add(app.start, `${app.name}: endpoint ${want} missing`);
      else if (app.endpoint.value !== want) add(app.endpoint.n, `${app.name}: endpoint must be ${want} (got ${app.endpoint.value})`);
    } else if (app.applicationType === 'merchant-center-custom-application' && app.endpoint) {
      add(app.endpoint.n, `${app.name}: a merchant-center-custom-application has no endpoint`);
    }

    for (const k of app.keys) {
      if (CTP_KEYS.has(k.key)) add(k.n, `${k.key}: CTP_* keys are injected, do not declare`);
      if (SECRET_LIKE.test(k.key) && k.section !== 'securedConfiguration') add(k.n, `${k.key}: secret-like key must be in securedConfiguration`);
    }

    if (hasPkg) {
      const pkg = readJson(pkgPath);
      if (pkg.workspaces) add(app.start, `${app.name}/package.json: workspaces are not allowed (each app is self-contained)`);
      if (!/>=\s*22/.test(String(pkg.engines?.node ?? ''))) add(app.start, `${app.name}/package.json: engines.node must be ">=22"`);
      if (app.applicationType === 'service') {
        for (const s of ['build', 'start', 'test']) if (!pkg.scripts?.[s]) add(app.start, `${app.name}/package.json: missing script "${s}"`);
      }
      for (const [hook, { cmd, n }] of Object.entries(app.scripts)) {
        const m = /^(?:yarn run|yarn)\s+(\S+)/.exec(cmd);
        if (m && !pkg.scripts?.[m[1]]) add(n, `${hook}: script "${m[1]}" does not exist in ${app.name}/package.json`);
      }
    }
  }

  if (inheritCount !== 1) add(inherit?.start ?? 1, `expected exactly one inheritAs block, found ${inheritCount}`);
  const scopes = scopesOf(inherit);
  if (!scopes || scopes.length === 0) add(inherit?.start ?? 1, 'inheritAs needs a non-empty scopes list');
  else if (scopes.includes('manage_project')) add(inherit.start, 'scope too broad: manage_project');

  const rootPkg = join(root, 'package.json');
  if (existsSync(rootPkg) && readJson(rootPkg).workspaces) add(1, 'root package.json must not define workspaces');

  const admin = join(HERE, 'check-admin-app-connect.mjs');
  if (resolve(root) === resolve(HERE, '..') && existsSync(admin)) {
    const r = spawnSync(process.execPath, [admin], { encoding: 'utf8' });
    if (r.status !== 0) add(0, `check-admin-app-connect: ${(r.stderr + r.stdout).trim().replace(/\n/g, ' | ')}`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ? resolve(process.argv[2]) : resolve(HERE, '..');
  const problems = checkContract(root);
  if (problems.length) {
    for (const p of problems) console.error(`connect.yaml:${p.n}: ${p.msg}`);
    console.error(`connect-contract: FAILED (${problems.length})`);
    process.exit(1);
  }
  console.log(`connect-contract: OK (${parseConnectYaml(readFileSync(join(root, 'connect.yaml'), 'utf8')).apps.length} apps)`);
}
