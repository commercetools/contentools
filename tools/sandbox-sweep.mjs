#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Deletes leftover live-e2e custom objects (containers starting with `contentools-test-`) from the SANDBOX project.
// Zero dependencies. Needs the same E2E_* variables as service/e2e (see service/e2e/README.md).

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PREFIX = 'contentools-test-';
export const REQUIRED = [
  'E2E_CTP_PROJECT_KEY', 'E2E_CTP_CLIENT_ID', 'E2E_CTP_CLIENT_SECRET', 'E2E_CTP_REGION',
  'E2E_CTP_SCOPE', 'E2E_BUSINESS_UNIT_KEY', 'E2E_ALLOW_PROJECT_KEY',
];

/** Throws unless all variables are set and the allow-list key equals the project key. Never includes values in messages. */
export function assertSandbox(env) {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`sweep: missing ${missing.join(', ')}`);
  if (env.E2E_CTP_PROJECT_KEY !== env.E2E_ALLOW_PROJECT_KEY) {
    throw new Error('sweep: refusing to run: E2E_ALLOW_PROJECT_KEY must equal E2E_CTP_PROJECT_KEY (sandbox only)');
  }
}

/** Only objects in test containers may ever be deleted. */
export const isTestObject = (o) => typeof o?.container === 'string' && o.container.startsWith(PREFIX);

export const hostsFor = (env) => ({
  auth: env.E2E_CTP_AUTH_URL || `https://auth.${env.E2E_CTP_REGION}.commercetools.com`,
  api: env.E2E_CTP_API_URL || `https://api.${env.E2E_CTP_REGION}.commercetools.com`,
});

export async function sweep(env, fetchImpl = fetch) {
  assertSandbox(env);
  const { auth, api } = hostsFor(env);
  const pk = env.E2E_CTP_PROJECT_KEY;
  const basic = Buffer.from(`${env.E2E_CTP_CLIENT_ID}:${env.E2E_CTP_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetchImpl(`${auth}/oauth/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: env.E2E_CTP_SCOPE }),
  });
  if (!tokenRes.ok) throw new Error(`sweep: token request failed (${tokenRes.status})`);
  const headers = { authorization: `Bearer ${(await tokenRes.json()).access_token}` };

  // Collect first (paging by offset), delete after, so deletions do not shift the pages.
  const victims = [];
  for (let offset = 0; ; offset += 500) {
    const res = await fetchImpl(`${api}/${pk}/custom-objects?limit=500&offset=${offset}`, { headers });
    if (!res.ok) throw new Error(`sweep: list failed (${res.status})`);
    const page = await res.json();
    victims.push(...page.results.filter(isTestObject));
    if (offset + page.results.length >= page.total || page.results.length === 0) break;
  }
  let deleted = 0;
  for (const o of victims) {
    const res = await fetchImpl(`${api}/${pk}/custom-objects/${encodeURIComponent(o.container)}/${encodeURIComponent(o.key)}`, { method: 'DELETE', headers });
    if (res.ok) deleted++;
  }
  return deleted;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const f of [process.env.E2E_ENV_FILE, join(root, 'service/.env.e2e'), join(root, 'service/.env.e2e.local')]) {
    if (f && existsSync(f)) process.loadEnvFile(f); // does not override variables already set
  }
  try {
    console.log(`deleted ${await sweep(process.env)}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
