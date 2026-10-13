/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
// Offline sanity check of the `mcp` block in the root connect.yaml (the shared check:connect script of spec O does not exist yet).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '..', '..', 'connect.yaml');
const doc = parse(readFileSync(file, 'utf8'));
const problems = [];
const app = (doc.deployAs ?? []).filter((a) => a.name === 'mcp');
if (app.length !== 1) problems.push(`expected exactly one app named mcp, found ${app.length}`);
const a = app[0] ?? {};
if (a.applicationType !== 'service') problems.push('applicationType must be service');
if (a.endpoint !== '/mcp') problems.push('endpoint must be /mcp');
if (a.scripts?.postDeploy !== 'yarn connector:post-deploy') problems.push('postDeploy script missing');
if (a.scripts?.preUndeploy) problems.push('mcp has no preUndeploy');
const std = a.configuration?.standardConfiguration ?? [];
const sec = a.configuration?.securedConfiguration ?? [];
if (std.length !== 6) problems.push(`expected 6 standard keys, found ${std.length}`);
if (sec.length !== 2) problems.push(`expected 2 secured keys, found ${sec.length}`);
for (const k of ['MCP_ACCESS_TOKEN', 'SERVICE_API_TOKEN']) {
  if (std.some((e) => e.key === k)) problems.push(`${k} must not be standard configuration`);
  if (!sec.some((e) => e.key === k)) problems.push(`${k} must be secured configuration`);
}
for (const e of [...std, ...sec]) {
  if (e.default !== undefined && typeof e.default !== 'string') problems.push(`${e.key}: default must be a string`);
  if (/^CTP_/.test(e.key)) problems.push(`${e.key}: CTP_ keys are not used by mcp`);
}
const svc = (doc.deployAs ?? []).find((x) => x.name === 'service');
if (!svc) problems.push('service application entry was removed');
if (JSON.stringify(doc.inheritAs?.apiClient?.scopes) !== JSON.stringify(['manage_key_value_documents', 'view_products'])) {
  problems.push('root inheritAs.apiClient scopes were changed');
}
if (problems.length > 0) {
  console.error(`connect.yaml check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`ok mcp: endpoint ${a.endpoint}, applicationType ${a.applicationType}, ${std.length} standard keys, ${sec.length} secured keys`);
