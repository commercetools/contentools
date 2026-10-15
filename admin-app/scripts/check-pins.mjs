// Guards the committed package.json: lockstep Merchant Center versions, no local specifiers, Yarn only.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const errors = [];

const mcVersions = new Map();
for (const [name, version] of Object.entries(deps)) {
  if (name.startsWith('@commercetools-frontend/'))
    mcVersions.set(name, version);
}
if (new Set(mcVersions.values()).size > 1) {
  errors.push(
    `@commercetools-frontend/* must share one version:\n${[...mcVersions]
      .map(([n, v]) => `  ${n}@${v}`)
      .join('\n')}`
  );
}

const nimbus = [
  '@commercetools/nimbus',
  '@commercetools/nimbus-icons',
  '@commercetools/nimbus-tokens',
].map((n) => deps[n]);
if (new Set(nimbus).size > 1)
  errors.push(`nimbus packages differ: ${nimbus.join(', ')}`);

const local = /^(file|link|workspace|portal):|\.\.\//;
for (const [name, spec] of Object.entries(deps)) {
  if (local.test(spec))
    errors.push(`dependency ${name} uses a local specifier: ${spec}`);
}
for (const [name, spec] of Object.entries(pkg.resolutions ?? {})) {
  if (local.test(spec)) {
    errors.push(
      `resolutions contains a file:/link:/workspace:/portal: leftover for ${name} (run: node tools/admin-app-use-local-puck.mjs --restore)`
    );
  }
}
if (!existsSync(join(appDir, 'yarn.lock'))) errors.push('yarn.lock is missing');
if (existsSync(join(appDir, 'package-lock.json'))) {
  errors.push('package-lock.json must not exist (Yarn only)');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('pins ok');
