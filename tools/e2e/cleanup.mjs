/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Delete every custom object whose container starts with the acceptance prefix. Usage (Node 22, no dependencies):
//   E2E_ALLOW_PROJECT_KEY=<same project key> CONTAINER_PREFIX=contentools-test-q-<runid>- node tools/e2e/cleanup.mjs [--dry-run]
// Also accepts CONTAINERS=a,b,c (explicit names). Reads CTP_* or E2E_CTP_* variables.
// Refuses to run unless every prefix/container starts with "contentools-test-" and the project key equals E2E_ALLOW_PROJECT_KEY.
const env = (k, alt) => { const v = process.env[k] || (alt && process.env[alt]); if (!v) { console.error(`missing ${k}`); process.exit(2); } return v; };
const project = env('CTP_PROJECT_KEY', 'E2E_CTP_PROJECT_KEY');
if (env('E2E_ALLOW_PROJECT_KEY') !== project) { console.error('E2E_ALLOW_PROJECT_KEY does not match the project key: refusing'); process.exit(2); }
const PREFIX = 'contentools-test-';
const prefix = (process.env.CONTAINER_PREFIX || '').trim();
const containers = (process.env.CONTAINERS || '').split(',').map((c) => c.trim()).filter(Boolean);
if (!prefix && !containers.length) { console.error('set CONTAINER_PREFIX (or CONTAINERS)'); process.exit(2); }
const bad = [prefix, ...containers].filter((c) => c && !c.startsWith(PREFIX));
if (bad.length) { console.error(`refusing: value(s) without the ${PREFIX} prefix: ${bad.join(', ')}`); process.exit(2); }
const dry = process.argv.includes('--dry-run');
const region = process.env.E2E_CTP_REGION;
const api = (process.env.CTP_API_URL || process.env.E2E_CTP_API_URL || `https://api.${region}.commercetools.com`).replace(/\/$/, '');
const auth = (process.env.CTP_AUTH_URL || process.env.E2E_CTP_AUTH_URL || `https://auth.${region}.commercetools.com`).replace(/\/$/, '');
const clientId = env('CTP_CLIENT_ID', 'E2E_CTP_CLIENT_ID');
const secret = env('CTP_CLIENT_SECRET', 'E2E_CTP_CLIENT_SECRET');
const scope = process.env.CTP_SCOPE || process.env.E2E_CTP_SCOPE;
const tok = await fetch(`${auth}/oauth/token`, {
  method: 'POST',
  headers: { Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', ...(scope ? { scope } : {}) }),
});
if (!tok.ok) { console.error(`token request failed: ${tok.status}`); process.exit(1); }
const headers = { Authorization: `Bearer ${(await tok.json()).access_token}` };
const matches = (c) => (prefix && c.startsWith(prefix)) || containers.includes(c);
// collect first (offset paging), delete afterwards so deletions do not shift pages
const victims = [];
for (let offset = 0; ; offset += 500) {
  const r = await fetch(`${api}/${project}/custom-objects?limit=500&offset=${offset}&sort=id%20asc`, { headers });
  if (!r.ok) { console.error(`list: ${r.status}`); process.exit(1); }
  const page = await r.json();
  victims.push(...page.results.filter((o) => matches(o.container)));
  if (!page.results.length || offset + page.results.length >= page.total) break;
}
let deleted = 0;
for (const o of victims) {
  if (dry) { console.log(`would delete ${o.container}/${o.key}`); continue; }
  const d = await fetch(`${api}/${project}/custom-objects/${encodeURIComponent(o.container)}/${encodeURIComponent(o.key)}`, { method: 'DELETE', headers });
  if (!d.ok) { console.error(`delete ${o.container}/${o.key}: ${d.status}`); process.exit(1); }
  deleted++;
}
console.log(dry ? `dry run: ${victims.length} object(s) listed` : `deleted ${deleted} object(s); containers empty`);
