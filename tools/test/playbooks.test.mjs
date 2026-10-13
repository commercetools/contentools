/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'verify');
const playbooks = readdirSync(DIR).filter((f) => /^\d\d-.*\.md$/.test(f));

test('there are five numbered playbooks', () => {
  assert.equal(playbooks.length, 5);
});

for (const f of playbooks.filter((p) => !p.startsWith('01-'))) {
  test(`${f} uses chrome-devtools tools and mentions evidence`, () => {
    const text = readFileSync(join(DIR, f), 'utf8');
    assert.match(text, /mcp__chrome-devtools__/);
    assert.match(text, /evidence/i);
  });
}

test('01-start-stack lists the three processes and evidence', () => {
  const text = readFileSync(join(DIR, '01-start-stack.md'), 'utf8');
  assert.match(text, /dev:fake-ct/);
  assert.match(text, /start:dev/);
  assert.match(text, /start:playground/);
  assert.match(text, /evidence/i);
});

test('05 is labelled owner-assisted and references M-04', () => {
  assert.match(readFileSync(join(DIR, '05-mc-app-owner-assisted.md'), 'utf8'), /M-04/);
});

test('README documents conventions and references the connector', () => {
  const text = readFileSync(join(DIR, 'README.md'), 'utf8');
  assert.match(text, /mcp__chrome-devtools__/);
  assert.match(text, /evidence/i);
});
