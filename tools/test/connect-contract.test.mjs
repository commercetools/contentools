/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContract } from '../check-connect-contract.mjs';
import { parseConnectYaml, scopesOf } from '../lib/connect-blocks.mjs';

const YAML = (over = {}) => `deployAs:
  - name: service
    applicationType: service
    endpoint: ${over.endpoint ?? '/service'}
    scripts:
      postDeploy: ${over.postDeploy ?? 'yarn connector:post-deploy'}
    configuration:
      standardConfiguration:
${over.std ?? '        - key: LOG_LEVEL\n'}      securedConfiguration:
${over.sec ?? '        - key: SERVICE_API_TOKEN\n'}  - name: admin-app
    applicationType: merchant-center-custom-application
${over.mcEndpoint ? '    endpoint: /x\n' : ''}    configuration:
      standardConfiguration:
        - key: CUSTOM_APPLICATION_ID
inheritAs:
  apiClient:
    scopes:
      - manage_key_value_documents
`;

function scratch(yaml, { servicePkg, skipAdmin } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'connect-contract-'));
  writeFileSync(join(root, 'connect.yaml'), yaml);
  const pkg = servicePkg ?? { engines: { node: '>=22' }, scripts: { build: 'x', start: 'x', test: 'x', 'connector:post-deploy': 'x' } };
  mkdirSync(join(root, 'service'));
  writeFileSync(join(root, 'service/package.json'), JSON.stringify(pkg));
  if (!skipAdmin) {
    mkdirSync(join(root, 'admin-app'));
    writeFileSync(join(root, 'admin-app/package.json'), JSON.stringify({ engines: { node: '>=22' }, scripts: {} }));
  }
  return root;
}
const msgs = (root) => checkContract(root).map((p) => p.msg);

test('a valid two-app file passes', () => {
  assert.deepEqual(msgs(scratch(YAML())), []);
});

test('secret-like key in standardConfiguration fails', () => {
  const root = scratch(YAML({ std: '        - key: SERVICE_API_TOKEN\n', sec: '' }));
  assert.ok(msgs(root).some((m) => /secret-like key must be in securedConfiguration/.test(m)));
});

test('declaring a CTP_ key fails', () => {
  assert.ok(msgs(scratch(YAML({ std: '        - key: CTP_CLIENT_ID\n' }))).some((m) => /injected/.test(m)));
});

test('missing folder, wrong endpoint, MC endpoint, missing script, workspaces', () => {
  assert.ok(msgs(scratch(YAML(), { skipAdmin: true })).some((m) => /app folder missing: admin-app/.test(m)));
  assert.ok(msgs(scratch(YAML({ endpoint: '/svc' }))).some((m) => /endpoint must be \/service/.test(m)));
  assert.ok(msgs(scratch(YAML({ mcEndpoint: true }))).some((m) => /has no endpoint/.test(m)));
  assert.ok(msgs(scratch(YAML({ postDeploy: 'yarn connector:nope' }))).some((m) => /does not exist/.test(m)));
  const pkg = { workspaces: ['a'], engines: { node: '>=22' }, scripts: { build: 'x', start: 'x', test: 'x', 'connector:post-deploy': 'x' } };
  assert.ok(msgs(scratch(YAML(), { servicePkg: pkg })).some((m) => /workspaces/.test(m)));
});

test('missing connect.yaml and manage_project are reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'connect-contract-'));
  assert.deepEqual(msgs(root), ['connect.yaml missing']);
  const broad = scratch(YAML().replace('manage_key_value_documents', 'manage_project'));
  assert.ok(msgs(broad).some((m) => /scope too broad/.test(m)));
});

test('scopesOf reads block and inline lists', () => {
  assert.deepEqual(scopesOf(parseConnectYaml(YAML()).inherit), ['manage_key_value_documents']);
  assert.deepEqual(scopesOf(parseConnectYaml('inheritAs:\n  apiClient:\n    scopes: [a, b]\n').inherit), ['a', 'b']);
});
