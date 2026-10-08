/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, commandFor } from '../run-all.mjs';

const T = [{ name: 'a', dir: 'a', pm: 'npm' }];

test('plan skips a target without the script', () => {
  const steps = plan(T, ['lint'], () => ({}));
  assert.equal(steps.length, 1);
  assert.equal(steps[0].action, 'skip');
});

test('plan runs a target that has the script', () => {
  assert.equal(plan(T, ['lint'], () => ({ lint: 'x' }))[0].action, 'run');
});

test('install is skipped when package.json is missing, run otherwise', () => {
  assert.equal(plan(T, ['install'], () => null)[0].action, 'skip');
  assert.equal(plan(T, ['install'], () => ({}))[0].action, 'run');
});

test('commandFor builds yarn and npm commands', () => {
  assert.deepEqual(commandFor({ pm: 'yarn', script: 'build' }), ['yarn', ['run', 'build']]);
  assert.deepEqual(commandFor({ pm: 'npm', script: 'build' }), ['npm', ['run', 'build']]);
  assert.deepEqual(commandFor({ pm: 'yarn', script: 'install' }), ['yarn', ['install']]);
});
