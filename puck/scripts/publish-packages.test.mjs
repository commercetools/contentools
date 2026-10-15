import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPackages, topoSort } from './lib/workspace.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const realPuck = join(here, '..');
const realLicense = join(realPuck, '..', 'LICENSE');

let sandbox;
let puck; // <sandbox>/puck
let shimDir;
let logFile;
let collectDir;

// Builds a throwaway copy of the workspace layout: root LICENSE, the real scripts,
// and every package manifest plus a stub dist/ so nothing needs a real build.
beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'puck-publish-test-'));
  puck = join(sandbox, 'puck');
  mkdirSync(join(puck, 'scripts', 'lib'), { recursive: true });
  cpSync(realLicense, join(sandbox, 'LICENSE'));
  cpSync(join(here, 'publish-packages.mjs'), join(puck, 'scripts', 'publish-packages.mjs'));
  cpSync(join(here, 'lib', 'workspace.mjs'), join(puck, 'scripts', 'lib', 'workspace.mjs'));
  writeFileSync(
    join(puck, 'package.json'),
    JSON.stringify({ name: 'sandbox-workspace', private: true, workspaces: ['packages/*'], packageManager: 'yarn@4.5.1' }, null, 2)
  );
  writeFileSync(join(puck, '.yarnrc.yml'), 'nodeLinker: node-modules\nenableGlobalCache: false\n');
  writeFileSync(join(puck, 'yarn.lock'), '');
  for (const d of readdirSync(join(realPuck, 'packages'))) {
    const dest = join(puck, 'packages', d);
    mkdirSync(join(dest, 'dist'), { recursive: true });
    cpSync(join(realPuck, 'packages', d, 'package.json'), join(dest, 'package.json'));
    cpSync(join(realPuck, 'packages', d, 'README.md'), join(dest, 'README.md'));
    writeFileSync(join(dest, 'dist', 'index.mjs'), 'export {};\n');
  }

  // A fake npm that records its arguments and keeps a copy of every tarball.
  shimDir = join(sandbox, 'shim');
  collectDir = join(sandbox, 'collected');
  logFile = join(sandbox, 'npm.log');
  mkdirSync(shimDir);
  mkdirSync(collectDir);
  writeFileSync(
    join(shimDir, 'npm'),
    `#!/bin/sh
echo "$@" >> "${logFile}"
if [ "$1" = "publish" ]; then cp "$2" "${collectDir}/"; fi
exit 0
`
  );
  chmodSync(join(shimDir, 'npm'), 0o755);
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const runScript = (args, env = {}) =>
  spawnSync(process.execPath, [join(puck, 'scripts', 'publish-packages.mjs'), ...args], {
    cwd: puck,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}`, ...env },
  });

describe('publish-packages.mjs', () => {
  it('dry run packs and "publishes" all packages in topological order', () => {
    const r = runScript([]);
    expect(r.status, r.stderr + r.stdout).toBe(0);

    const calls = readFileSync(logFile, 'utf8').trim().split('\n').filter((l) => l.startsWith('publish'));
    expect(calls).toHaveLength(10);
    for (const c of calls) {
      expect(c).toContain('--dry-run');
      expect(c).toContain('--access public');
    }

    const expected = topoSort(listPackages(realPuck)).map((p) => p.name);
    const invoked = calls.map((c) => {
      const file = c.split(' ')[1].split('/').pop();
      return expected.find((n) => file.startsWith(n.replace('@', '').replace('/', '-') + '-'));
    });
    expect(invoked).toEqual(expected);

    const printed = [...r.stdout.matchAll(/^\s+\d+\. (\S+)@/gm)].map((m) => m[1]);
    expect(printed).toEqual(expected);
  });

  it('puts the root LICENSE and a rewritten manifest into every tarball and leaves no LICENSE behind', () => {
    const tarballs = readdirSync(collectDir);
    expect(tarballs).toHaveLength(10);
    const rootLicenseText = readFileSync(realLicense, 'utf8');
    for (const t of tarballs) {
      const license = spawnSync('tar', ['-xzOf', join(collectDir, t), 'package/LICENSE'], { encoding: 'utf8' });
      expect(license.stdout, t).toBe(rootLicenseText);
      const manifest = spawnSync('tar', ['-xzOf', join(collectDir, t), 'package/package.json'], { encoding: 'utf8' });
      expect(manifest.stdout, t).not.toContain('workspace:');
      const list = spawnSync('tar', ['-tzf', join(collectDir, t)], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
      for (const f of list) expect(f).toMatch(/^package\/(LICENSE|README\.md|package\.json|dist\/.*)$/);
    }
    for (const d of readdirSync(join(puck, 'packages'))) {
      expect(existsSync(join(puck, 'packages', d, 'LICENSE'))).toBe(false);
    }
  });

  it('refuses --execute when the git tree is not clean', () => {
    const git = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd: sandbox, encoding: 'utf8' });
    git('init', '-q');
    git('add', '-A');
    git('commit', '-q', '-m', 'init');
    writeFileSync(join(sandbox, 'uncommitted.txt'), 'dirty\n');
    const r = runScript(['--execute']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('not clean');
  });
});
