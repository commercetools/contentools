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
import { buildArgs, findScriptsDir } from '../labs-publish.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'ct-'));

test('findScriptsDir: LABS_PUBLISH_DIR without ossify.mjs gives null', () => {
  assert.equal(findScriptsDir({ LABS_PUBLISH_DIR: tmp() }, tmp()), null);
});

test('findScriptsDir: LABS_PUBLISH_DIR with ossify.mjs is returned', () => {
  const d = tmp();
  writeFileSync(join(d, 'ossify.mjs'), '');
  assert.equal(findScriptsDir({ LABS_PUBLISH_DIR: d }, tmp()), d);
});

test('findScriptsDir: plugin cache picks the highest version', () => {
  const home = tmp();
  for (const v of ['0.9.0', '0.29.4']) {
    const dir = join(home, '.claude/plugins/cache/presales-plugin/presales', v, 'skills/commercetools-labs-publish/scripts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'ossify.mjs'), '');
  }
  assert.match(findScriptsDir({}, home), /0\.29\.4/);
});

test('findScriptsDir: nothing installed gives null', () => {
  assert.equal(findScriptsDir({}, tmp()), null);
});

test('buildArgs', () => {
  assert.deepEqual(buildArgs('gate', ['--ack'], '/d', '/r'), ['/d/gate.mjs', '--repo', '/r', '--ack']);
  const o = buildArgs('ossify', [], '/d', '/r');
  assert.deepEqual(o.slice(-2), ['--year', '2026']);
  assert.ok(!o.includes('--apply'));
  assert.throws(() => buildArgs('x', [], '/d', '/r'));
});
