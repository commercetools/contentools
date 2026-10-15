import { describe, expect, it } from 'vitest';
import { internalDeps, listPackages, topoSort } from './workspace.mjs';

const order = () => topoSort(listPackages()).map((p) => p.name);
const idx = (names, n) => names.indexOf(`@commercetools-labs/${n}`);

describe('topoSort', () => {
  it('lists all ten packages, contentools-types first', () => {
    const names = order();
    expect(names).toHaveLength(10);
    expect(names[0]).toBe('@commercetools-labs/contentools-types');
  });

  it('places every internal dependency before its dependants', () => {
    const pkgs = listPackages();
    const names = topoSort(pkgs).map((p) => p.name);
    for (const p of pkgs) {
      for (const dep of internalDeps(p)) expect(names.indexOf(dep)).toBeLessThan(names.indexOf(p.name));
    }
  });

  it('publishes editor and renderer before the managers that use them', () => {
    const names = order();
    for (const consumer of ['contentools-content-manager', 'contentools-page-manager']) {
      expect(idx(names, 'contentools-editor')).toBeLessThan(idx(names, consumer));
      expect(idx(names, 'contentools-renderer')).toBeLessThan(idx(names, consumer));
    }
  });

  it('throws on a cycle', () => {
    const a = { name: '@commercetools-labs/a', pj: { dependencies: { '@commercetools-labs/b': 'workspace:^' } } };
    const b = { name: '@commercetools-labs/b', pj: { dependencies: { '@commercetools-labs/a': 'workspace:^' } } };
    expect(() => topoSort([a, b])).toThrow(/cycle/);
  });
});
