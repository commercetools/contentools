/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Verifies (and with --fix adds) the SPDX header on every source file of the
// puck workspace. --fix never touches a file whose first 2000 characters
// mention "copyright"; those need a header by hand (mirrors the repo tool).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fix = process.argv.includes('--fix');
const HEADER = `/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
`;
const SKIP = new Set(['node_modules', 'dist', 'coverage']);
const EXT = /\.(ts|tsx|mjs|js|cjs|cts)$/;

const files = [];
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT.test(e.name)) files.push(p);
  }
};
for (const pkg of readdirSync(join(root, 'packages'))) walk(join(root, 'packages', pkg, 'src'));
walk(join(root, 'playground', 'src'));
walk(join(root, 'scripts'));
for (const f of readdirSync(root)) if (EXT.test(f)) files.push(join(root, f));
for (const f of readdirSync(join(root, 'playground'))) if (EXT.test(f)) files.push(join(root, 'playground', f));

const missing = [];
const manual = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (text.split('\n').slice(0, 6).join('\n').includes('SPDX-License-Identifier: MIT')) continue;
  if (fix && !/copyright/i.test(text.slice(0, 2000))) {
    const lines = text.split('\n');
    if (lines[0].startsWith('#!')) {
      writeFileSync(f, `${lines[0]}\n${HEADER}\n${lines.slice(1).join('\n')}`);
    } else {
      writeFileSync(f, `${HEADER}\n${text}`);
    }
    continue;
  }
  (fix ? manual : missing).push(f.slice(root.length + 1));
}
if (manual.length) console.log(`needs manual header:\n  ${manual.join('\n  ')}`);
if (missing.length) {
  console.error(`missing SPDX header:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`headers: OK (${files.length} files)`);
