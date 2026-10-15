import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildArgs, findScriptsDir } from '../labs-publish.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'ct-'));

test('findScriptsDir: LABS_PUBLISH_DIR without ossify.mjs gives null', () => {
  assert.equal(findScriptsDir({ LABS_PUBLISH_DIR: tmp() }), null);
});

test('findScriptsDir: LABS_PUBLISH_DIR with ossify.mjs is returned', () => {
  const d = tmp();
  writeFileSync(join(d, 'ossify.mjs'), '');
  assert.equal(findScriptsDir({ LABS_PUBLISH_DIR: d }), d);
});

test('findScriptsDir: nothing configured gives null', () => {
  assert.equal(findScriptsDir({}), null);
});

test('buildArgs', () => {
  assert.deepEqual(buildArgs('gate', ['--ack'], '/d', '/r'), ['/d/gate.mjs', '--repo', '/r', '--ack']);
  const o = buildArgs('ossify', [], '/d', '/r');
  assert.deepEqual(o.slice(-2), ['--year', '2026']);
  assert.ok(!o.includes('--apply'));
  assert.throws(() => buildArgs('x', [], '/d', '/r'));
});
