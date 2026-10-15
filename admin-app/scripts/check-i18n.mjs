// core.json (extracted), en.json and de.json have the same keys, no empty values, and de is translated.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'i18n',
  'data'
);
const read = (name) =>
  JSON.parse(readFileSync(join(dataDir, `${name}.json`), 'utf8'));
const core = read('core');
const en = read('en');
const de = read('de');
// Values that are the same in English and German on purpose (product names only).
const sameInGerman = new Set([]);

const errors = [];
const keys = (o) => Object.keys(o).sort().join('\n');
if (keys(core) !== keys(en))
  errors.push('core.json and en.json have different keys');
if (keys(en) !== keys(de))
  errors.push('en.json and de.json have different keys');
for (const [name, catalog] of [
  ['core', core],
  ['en', en],
  ['de', de],
]) {
  for (const [key, value] of Object.entries(catalog)) {
    if (typeof value !== 'string' || value.trim() === '')
      errors.push(`${name}.json: empty value for ${key}`);
  }
}
for (const [key, value] of Object.entries(de)) {
  if (value === en[key] && !sameInGerman.has(key))
    errors.push(`de.json: ${key} is not translated`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('i18n ok');
