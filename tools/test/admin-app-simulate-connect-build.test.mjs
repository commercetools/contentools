/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildEnv, inspectBuild, unexpectedCspHosts } from '../admin-app-simulate-connect-build.mjs';

const OBSERVED =
  "default-src 'none'; script-src 'self' 'sha256-abc=' https://admin-app-canary.example.com/; " +
  'connect-src \'self\' app.launchdarkly.com clientstream.launchdarkly.com app.getsentry.com *.sentry.io ' +
  'https://mc-api.europe-west1.gcp.commercetools.com https://admin-app-canary.example.com/; img-src * data:; ' +
  "style-src 'self' fonts.googleapis.com data: 'unsafe-inline'; font-src 'self' fonts.gstatic.com data:; " +
  "frame-src 'self'; upgrade-insecure-requests";

test('the observed default policy has no unexpected host; a foreign host is reported', () => {
  assert.deepEqual(unexpectedCspHosts(OBSERVED), []);
  assert.deepEqual(unexpectedCspHosts(`${OBSERVED}; connect-src https://evil.example.org`), ['evil.example.org']);
});

test('the build environment carries only the Connect variables and the canary secret', () => {
  const env = buildEnv('https://svc.example.com/service');
  assert.deepEqual(Object.keys(env).sort(), [
    'APPLICATION_URL',
    'CLOUD_IDENTIFIER',
    'CONTENTOOLS_SERVICE_URL',
    'CTP_CLIENT_SECRET',
    'CUSTOM_APPLICATION_ID',
    'ENTRY_POINT_URI_PATH',
    'HOME',
    'PATH',
  ]);
  assert.equal(buildEnv().CONTENTOOLS_SERVICE_URL, 'https://pending.invalid/service');
});

const fixture = (appJson, extra = '') => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-app-public-'));
  mkdirSync(dir, { recursive: true });
  const csp = `<meta http-equiv="Content-Security-Policy" content="${OBSERVED}">`;
  writeFileSync(join(dir, 'index.html'), `<html>${csp}<script>window.app = ${JSON.stringify(appJson)};</script></html>`);
  if (extra) writeFileSync(join(dir, 'app.js'), extra);
  return dir;
};
const GOOD = { entryPointUriPath: 'contentools', location: 'gcp-eu', mcApiUrl: 'https://mc-api.europe-west1.gcp.commercetools.com', serviceUrl: '' };

test('inspectBuild accepts a good output and rejects a leaked canary or a wrong service url', () => {
  assert.ok(inspectBuild(fixture(GOOD)).every((r) => r.ok));
  assert.ok(inspectBuild(fixture(GOOD, 'x="canary-secret-value"')).some((r) => !r.ok));
  assert.ok(inspectBuild(fixture(GOOD), 'https://svc.example.com/service').some((r) => !r.ok));
});
