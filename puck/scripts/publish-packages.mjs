// Maintainer runbook (local, no CI; run from puck/):
//   1. node scripts/bump-versions.mjs <patch|minor|major|x.y.z[-rc.N]>   (lockstep)
//   2. yarn install --immutable && yarn verify                           (all gates green)
//   3. commit the version bump (the tree must be clean for --execute)
//   4. npm login                                                         (2FA account)
//   5. node scripts/publish-packages.mjs                                 (dry run, default)
//   6. node scripts/publish-packages.mjs --execute                       (asks you to type "publish <version>")
// A release candidate: node scripts/bump-versions.mjs 1.0.0-rc.0, then publish;
// any prerelease is published under the "next" dist-tag, stable under "latest".
// Packages are packed with Yarn first (npm would not rewrite workspace:^) and the
// root LICENSE is copied into each package only while packing. npm asks for the
// one-time password itself; this script never sees or stores it.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline/promises';
import { listPackages, topoSort, puckRoot } from './lib/workspace.mjs';

const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) fail(`${cmd} ${args[0]} failed (exit ${r.status ?? 'signal'})`);
};

const alreadyPublished = (name, version) =>
  spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' }).stdout.trim() === version;

const execute = process.argv.includes('--execute');
const pkgs = topoSort(listPackages());
const versions = new Set(pkgs.map((p) => p.version));
if (versions.size !== 1) fail(`versions differ: ${[...versions].join(', ')}`);
const version = [...versions][0];
const tag = version.includes('-') ? 'next' : 'latest';

for (const p of pkgs) {
  if (!existsSync(join(p.dir, 'dist/index.mjs'))) fail(`${p.name}: dist/ missing, run "yarn build" first`);
}

const rootLicense = join(puckRoot, '..', 'LICENSE');
if (!existsSync(rootLicense)) fail('root LICENSE missing');

if (execute) {
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', cwd: puckRoot }).trim()) fail('git tree is not clean');
  if (spawnSync('npm', ['whoami'], { stdio: 'ignore' }).status !== 0) fail('not logged in: run "npm login"');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type "publish ${version}" to publish ${pkgs.length} packages with tag ${tag}: `);
  rl.close();
  if (answer.trim() !== `publish ${version}`) fail('confirmation not given');
}

console.log('order:\n' + pkgs.map((p, i) => `  ${i + 1}. ${p.name}@${p.version}`).join('\n'));
console.log(`mode: ${execute ? 'PUBLISH' : 'dry run'}, tag: ${tag}`);
const tmp = mkdtempSync(join(tmpdir(), 'puck-pack-'));
try {
  for (const p of pkgs) {
    if (execute && alreadyPublished(p.name, version)) {
      console.log(`skip ${p.name}@${version} (already on npm)`);
      continue;
    }
    const tgz = join(tmp, `${p.name.replace('@', '').replace('/', '-')}-${version}.tgz`);
    const pkgLicense = join(p.dir, 'LICENSE');
    copyFileSync(rootLicense, pkgLicense); // injected only for packing; never committed
    try {
      run('yarn', ['pack', '--filename', tgz], p.dir);
    } finally {
      rmSync(pkgLicense, { force: true });
    }
    run('npm', ['publish', tgz, '--access', 'public', '--tag', tag, ...(execute ? [] : ['--dry-run'])], p.dir);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
