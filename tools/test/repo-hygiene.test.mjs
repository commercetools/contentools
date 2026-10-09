/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { pathFindings, lockfileFindings, secretFindings } from '../check-repo-hygiene.mjs';

test('CI files, lockfiles, env, license, docker are flagged', () => {
  assert.match(pathFindings(['.github/workflows/ci.yml'])[0].rule, /no CI files/);
  assert.match(pathFindings(['service/package-lock.json'])[0].rule, /package-lock/);
  assert.equal(pathFindings(['service/.env']).length, 1);
  assert.equal(pathFindings(['service/.env.example']).length, 0);
  assert.equal(pathFindings(['service/LICENSE']).length, 1);
  assert.equal(pathFindings(['LICENSE']).length, 0);
  assert.equal(pathFindings(['Dockerfile']).length, 1);
});

test('_pending is strict-only', () => {
  assert.deepEqual(pathFindings(['service/src/_pending/a.ts']), []);
  assert.equal(pathFindings(['service/src/_pending/a.ts'], { strict: true })[0].rule, 'no _pending folder at release');
});

test('lockfileFindings reports only the missing lockfile', () => {
  const r = lockfileFindings(['service/package.json', 'mcp/package.json', 'mcp/yarn.lock']);
  assert.deepEqual(r.map((x) => x.path), ['service/yarn.lock']);
});

test('secretFindings never returns the matched text', () => {
  const key = 'AI' + 'za' + 'x'.repeat(35);
  const r = secretFindings('src/a.ts', `const k = '${key}'`);
  assert.equal(r.length, 1);
  assert.equal('text' in r[0], false);
  assert.ok(!JSON.stringify(r).includes(key));
});

test('secretFindings skips tests, hygiene-ok lines and env reads', () => {
  const key = 'AI' + 'za' + 'x'.repeat(35);
  assert.deepEqual(secretFindings('service/tests/a.test.ts', `'${key}'`), []);
  assert.deepEqual(secretFindings('src/a.ts', `const k = '${key}' // hygiene-ok`), []);
  assert.deepEqual(secretFindings('src/a.ts', 'const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN as string;'), []);
});
