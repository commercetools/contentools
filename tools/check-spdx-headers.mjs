#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLOCK = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.css', '.scss', '.java', '.kt', '.kts'];
const HASH = ['.graphql', '.sh'];
const LINES = [
  'SPDX-License-Identifier: MIT',
  /^Copyright \(c\) \d{4} commercetools GmbH and the commercetools-labs contributors$/,
  'Freely available, AS IS and UNSUPPORTED. See LICENSE.',
];
const GENERATED = [/(^|\/)generated\//, /\.generated\.[a-z]+$/, /-lock\.[a-z]+$/];

const match = (want, got) => (want instanceof RegExp ? want.test(got) : want === got);

/** True when `text` (of a file with extension `ext`) starts with the exact header (a leading #! line is allowed). */
export function hasHeader(text, ext) {
  const lines = text.split('\n');
  let i = lines[0]?.startsWith('#!') ? 1 : 0;
  if (BLOCK.includes(ext)) {
    if (lines[i] !== '/*') return false;
    return LINES.every((w, k) => lines[i + 1 + k]?.startsWith(' * ') && match(w, lines[i + 1 + k].slice(3))) && lines[i + 4] === ' */';
  }
  if (HASH.includes(ext)) return LINES.every((w, k) => lines[i + k]?.startsWith('# ') && match(w, lines[i + k].slice(2)));
  return true;
}

export function findOffenders(root, files = listFiles(root)) {
  const out = [];
  let checked = 0;
  for (const f of files) {
    const ext = extname(f);
    if (![...BLOCK, ...HASH].includes(ext) || GENERATED.some((re) => re.test(f))) continue;
    checked++;
    if (!hasHeader(readFileSync(join(root, f), 'utf8'), ext)) out.push(f);
  }
  return { checked, offenders: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { checked, offenders } = findOffenders(ROOT);
  if (offenders.length) { console.error(`spdx: ${offenders.length} file(s) without the header:\n${offenders.join('\n')}`); process.exit(1); }
  console.log(`spdx: OK (${checked} files)`);
}
