/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkAdminAppConnect } from '../check-admin-app-connect.mjs';

const real = readFileSync(new URL('../../connect.yaml', import.meta.url), 'utf8');

test('the repository connect.yaml passes', () => {
  assert.deepEqual(checkAdminAppConnect(real), []);
});

test('a stray endpoint inside the block fails, the service endpoint does not', () => {
  assert.ok(real.includes('endpoint: /service'));
  const bad = real.replace(
    '    applicationType: merchant-center-custom-application\n',
    '    applicationType: merchant-center-custom-application\n    endpoint: /x\n'
  );
  assert.ok(checkAdminAppConnect(bad).some((p) => p.includes('endpoint')));
});

test('a second CLOUD_IDENTIFIER, APPLICATION_URL, a missing key and a missing folder fail', () => {
  assert.ok(
    checkAdminAppConnect(`${real}      - key: CLOUD_IDENTIFIER\n`).some((p) => p.includes('exactly once'))
  );
  const withUrl = real.replace(
    '        - key: CONTENTOOLS_SERVICE_URL\n',
    '        - key: APPLICATION_URL\n        - key: CONTENTOOLS_SERVICE_URL\n'
  );
  assert.ok(checkAdminAppConnect(withUrl).some((p) => p.includes('APPLICATION_URL')));
  assert.ok(
    checkAdminAppConnect(real.replace('key: CUSTOM_APPLICATION_ID', 'key: X')).some((p) => p.includes('lacks key'))
  );
  assert.ok(checkAdminAppConnect(real, false).some((p) => p.includes('folder')));
});
