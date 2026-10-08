#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGETS } from './lib/targets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Pure: which (target, script) pairs run or are skipped. `scriptsOf(dir)` returns the package.json "scripts" object or null. */
export function plan(targets, scripts, scriptsOf) {
  const steps = [];
  for (const script of scripts) {
    for (const t of targets) {
      const have = scriptsOf(t.dir);
      const runnable = script === 'install' ? have !== null : have !== null && script in have;
      steps.push({ ...t, script, action: runnable ? 'run' : 'skip' });
    }
  }
  return steps;
}

export function commandFor(step) {
  if (step.script === 'install') return step.pm === 'yarn' ? ['yarn', ['install']] : ['npm', ['install']];
  return step.pm === 'yarn' ? ['yarn', ['run', step.script]] : ['npm', ['run', step.script]];
}

const scriptsOf = (dir) => {
  const p = join(ROOT, dir, 'package.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).scripts ?? {}) : null;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const scripts = process.argv.slice(2);
  if (scripts.length === 0) { console.error('usage: node tools/run-all.mjs <script> [<script>...]'); process.exit(2); }
  const failed = [];
  for (const step of plan(TARGETS, scripts, scriptsOf)) {
    if (step.action === 'skip') { console.log(`skip  ${step.name}: no "${step.script}" script`); continue; }
    console.log(`\n== ${step.name}: ${step.script}`);
    const [cmd, args] = commandFor(step);
    const r = spawnSync(cmd, args, { cwd: join(ROOT, step.dir), stdio: 'inherit' });
    if (r.status !== 0) failed.push(`${step.name}:${step.script}`);
  }
  if (failed.length) { console.error(`\nFAILED: ${failed.join(', ')}`); process.exit(1); }
}
