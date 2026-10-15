// Lockstep version bump for all puck packages (and the playground).
// Usage: node scripts/bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]> [--dry-run]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listPackages, topoSort, puckRoot } from './lib/workspace.mjs';

const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find((a) => !a.startsWith('--'));
if (!target) fail('usage: bump-versions.mjs <patch|minor|major|x.y.z[-pre.N]> [--dry-run]');

const pkgs = topoSort(listPackages());
const versions = new Set(pkgs.map((p) => p.version));
if (versions.size !== 1) fail(`package versions differ: ${[...versions].join(', ')}`);
const current = [...versions][0];

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;
const next = (() => {
  if (SEMVER.test(target)) return target;
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) fail(`cannot parse current version ${current}`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (target === 'major') return `${maj + 1}.0.0`;
  if (target === 'minor') return `${maj}.${min + 1}.0`;
  if (target === 'patch') return `${maj}.${min}.${pat + 1}`;
  return fail(`unknown bump "${target}"`);
})();

const playgroundFile = join(puckRoot, 'playground', 'package.json');
const files = [...pkgs.map((p) => ({ name: p.name, file: join(p.dir, 'package.json') })), { name: 'playground', file: playgroundFile }];
for (const { name, file } of files) {
  const pj = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`${name}: ${pj.version} -> ${next}`);
  if (!dryRun) {
    pj.version = next;
    writeFileSync(file, JSON.stringify(pj, null, 2) + '\n');
  }
}
if (dryRun) console.log('dry run: no file changed');
