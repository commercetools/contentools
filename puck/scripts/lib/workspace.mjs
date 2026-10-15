import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCOPE = '@commercetools-labs/';

/** puck/ directory (parent of scripts/). */
export const puckRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Reads packages/* and returns [{ dir, name, version, pj }] sorted by folder name. */
export function listPackages(root = puckRoot) {
  const base = join(root, 'packages');
  return readdirSync(base)
    .filter((d) => existsSync(join(base, d, 'package.json')))
    .sort()
    .map((d) => {
      const dir = join(base, d);
      const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      return { dir, name: pj.name, version: pj.version, pj };
    });
}

/** Internal (same scope) dependency names of one package. */
export const internalDeps = (pkg) =>
  Object.keys(pkg.pj.dependencies ?? {}).filter((n) => n.startsWith(SCOPE));

/**
 * Topological order: every package appears after all of its internal
 * dependencies. Ties are broken alphabetically so the order is stable.
 * Throws on a cycle.
 */
export function topoSort(pkgs) {
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const sorted = [];
  const state = new Map();
  const visit = (p, stack) => {
    if (state.get(p.name) === 'done') return;
    if (state.get(p.name) === 'visiting') throw new Error(`dependency cycle: ${[...stack, p.name].join(' -> ')}`);
    state.set(p.name, 'visiting');
    for (const dep of internalDeps(p).sort()) {
      const d = byName.get(dep);
      if (d) visit(d, [...stack, p.name]);
    }
    state.set(p.name, 'done');
    sorted.push(p);
  };
  for (const p of [...pkgs].sort((a, b) => a.name.localeCompare(b.name))) visit(p, []);
  return sorted;
}
