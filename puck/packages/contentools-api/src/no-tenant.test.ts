import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The retired tenant names, spelled in pieces so the repository guard does not flag this file.
const RETIRED = new RegExp(`${'project'}Key|x-${'project'}-key`);

const packagesDir = join(__dirname, '..', '..');

// This file spells the names out, and PageManager.test asserts at compile time that the prop is gone.
const ALLOWED = new Set([
  'contentools-api/src/no-tenant.test.ts',
  'contentools-page-manager/src/PageManager.test.tsx',
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe('single tenant', () => {
  it('has no tenant names left in any package source', () => {
    const offenders = readdirSync(packagesDir)
      .filter((name) => existsSync(join(packagesDir, name, 'src')))
      .flatMap((name) => walk(join(packagesDir, name, 'src')))
      .filter((file) => /\.(ts|tsx|json)$/.test(file))
      .filter((file) => !ALLOWED.has(relative(packagesDir, file)))
      .filter((file) => RETIRED.test(readFileSync(file, 'utf8')))
      .map((file) => relative(packagesDir, file));
    expect(offenders).toEqual([]);
  });

  it('has none in the built bundle either', () => {
    const dist = join(packagesDir, 'contentools-api', 'dist', 'index.js');
    if (!existsSync(dist)) return; // `yarn build` has not run yet
    expect(RETIRED.test(readFileSync(dist, 'utf8'))).toBe(false);
  });
});
