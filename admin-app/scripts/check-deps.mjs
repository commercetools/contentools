// Every dependency is imported from src or justified in scripts/deps-allowlist.json; every import is declared.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
const allow = JSON.parse(
  readFileSync(join(appDir, 'scripts', 'deps-allowlist.json'), 'utf8')
);

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const toPackageName = (spec) => {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const imported = new Set();
const patterns = [
  /from\s+['"]([^'"./][^'"]*)['"]/g,
  /import\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g,
];
for (const file of walk(join(appDir, 'src')).filter((f) =>
  /\.(ts|tsx)$/.test(f)
)) {
  const text = readFileSync(file, 'utf8');
  for (const re of patterns) {
    for (const match of text.matchAll(re))
      imported.add(toPackageName(match[1]));
  }
}

const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);
const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);
const errors = [];

for (const name of declared) {
  if (!imported.has(name) && !(name in allow)) {
    errors.push(`unused dependency (not imported, not in allowlist): ${name}`);
  }
}
for (const name of Object.keys(allow)) {
  if (!declared.has(name))
    errors.push(`allowlist entry is not a dependency: ${name}`);
}
for (const name of imported) {
  if (!declared.has(name) && !builtins.has(name))
    errors.push(`import not declared in package.json: ${name}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('deps ok');
