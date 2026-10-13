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
import { listFiles } from '../lib/files.mjs';

test('filesystem walk ignores node_modules/build and returns sorted relative paths', () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-'));
  for (const p of ['b.ts', 'a/z.ts', 'a/node_modules/x.ts', 'build/y.ts']) {
    mkdirSync(join(d, p, '..'), { recursive: true });
    writeFileSync(join(d, p), '');
  }
  assert.deepEqual(listFiles(d), ['a/z.ts', 'b.ts']);
});
