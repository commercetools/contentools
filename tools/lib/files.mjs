import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Directory names never scanned (mirrors the labs `ossify` skip list, plus our scratch dirs). */
export const SKIP_DIRS = new Set(['.git', 'node_modules', 'public', 'dist', 'build', 'coverage', '.next', '.turbo', '.yarn', 'temp', '.connect']);

const skipped = (rel) => rel.split('/').some((seg) => SKIP_DIRS.has(seg));

/** Repo-relative file paths, sorted. */
export function listFiles(root) {
  let files;
  if (existsSync(join(root, '.git'))) {
    files = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
      .split('\0').filter(Boolean).filter((f) => existsSync(join(root, f)));
  } else {
    files = [];
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name)); }
        else files.push(relative(root, join(dir, e.name)));
      }
    })(root);
  }
  return files.filter((f) => !skipped(f)).sort();
}
