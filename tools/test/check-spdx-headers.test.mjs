import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findOffenders, hasHeader } from '../check-spdx-headers.mjs';

const HEADER = `/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
`;

test('hasHeader accepts the exact block, also after a shebang', () => {
  assert.equal(hasHeader(`${HEADER}export const a = 1;\n`, '.ts'), true);
  assert.equal(hasHeader(`#!/usr/bin/env node\n${HEADER}x\n`, '.mjs'), true);
});

test('hasHeader rejects missing or foreign headers', () => {
  assert.equal(hasHeader('export const a = 1;\n', '.ts'), false);
  assert.equal(hasHeader(HEADER.replace('commercetools GmbH and the commercetools-labs contributors', 'Someone Else'), '.ts'), false);
});

test('findOffenders reports only bad source files and ignores .md', () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-'));
  writeFileSync(join(d, 'good.ts'), `${HEADER}export {};\n`);
  writeFileSync(join(d, 'bad.ts'), 'export {};\n');
  writeFileSync(join(d, 'readme.md'), '# hi\n');
  const { checked, offenders } = findOffenders(d);
  assert.equal(checked, 2);
  assert.deepEqual(offenders, ['bad.ts']);
});
