#!/usr/bin/env node
// One command for every local gate (there is no hosted CI in this project).
//   node tools/verify.mjs [--only a,b] [--skip a,b] [--fail-fast] [--install] [--connect] [--strict]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSteps, parseArgs } from './lib/verify-steps.mjs';
import { hasExecutable, yarnCommand } from './lib/yarn.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGS = join(ROOT, '.verify-logs');

const HELP = `usage: node tools/verify.mjs [flags]
  --only a,b     run only these steps (ids: tools spdx forbidden legacy-calls hygiene connect-contract docs puck service mcp admin-app admin-app-connect-build connect-validate)
  --skip a,b     skip these steps
  --fail-fast    stop at the first failure (default: run everything, report all)
  --install      run each app's frozen install first (network; slow the first time)
  --connect      also run the Connect build simulation and 'commercetools connect validate .' (Docker)
  --strict       release grade: --connect, empty forbidden-terms pending list, yarn.lock files required, nothing may be skipped
Logs: .verify-logs/<step>.log (git-ignored).`;

const scriptsOf = (dir) => {
  const p = join(ROOT, dir, 'package.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).scripts ?? {}) : null;
};

function run(cmd, args, cwd, env) {
  const r = spawnSync(cmd, args, { cwd: join(ROOT, cwd), env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `$ ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? `\nerror: ${r.error.message}\n` : ''}`;
  return { ok: r.status === 0, out };
}

function execute(step, strict) {
  if (step.skip) return strict ? { status: 'FAIL', note: `strict: nothing to run (${step.skip})` } : { status: 'SKIP', note: step.skip };
  if (step.requires && !hasExecutable(step.requires)) {
    const hint = 'install: npm install -g @commercetools/cli';
    return strict ? { status: 'FAIL', note: `strict: ${step.requires} missing (${hint})` } : { status: 'SKIP', note: hint };
  }
  let log = '';
  const t0 = Date.now();
  const commands = step.seq ?? [[step.cmd, step.args]];
  let ok = true;
  for (const [cmd, args] of commands) {
    const c = cmd === 'yarn' ? yarnCommand(ROOT, step.cwd, args) : { cmd, args, env: process.env };
    const r = run(c.cmd, c.args, step.cwd, c.env);
    log += `${r.out}\n`;
    if (!r.ok) { ok = false; break; }
  }
  mkdirSync(LOGS, { recursive: true });
  const logPath = join(LOGS, `${step.id.replace(/[^\w.-]/g, '_')}.log`);
  writeFileSync(logPath, log);
  return { status: ok ? 'PASS' : 'FAIL', seconds: (Date.now() - t0) / 1000, logPath: ok ? null : logPath };
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); console.error(HELP); process.exit(2); }
  if (opts.help) { console.log(HELP); return; }
  const rows = [];
  for (const step of buildSteps(opts, scriptsOf)) {
    process.stdout.write(`... ${step.id}\n`);
    const r = execute(step, opts.strict);
    rows.push({ id: step.id, ...r });
    if (r.status === 'FAIL' && opts.failFast) break;
  }
  const w = Math.max(...rows.map((r) => r.id.length), 4);
  console.log(`\n${'step'.padEnd(w)}  status  seconds`);
  for (const r of rows) console.log(`${r.id.padEnd(w)}  ${r.status.padEnd(6)}  ${r.seconds === undefined ? '-' : r.seconds.toFixed(1)}${r.note ? `  (${r.note})` : ''}`);
  const failed = rows.filter((r) => r.status === 'FAIL');
  for (const r of failed) if (r.logPath) console.log(`FAIL ${r.id}: see ${r.logPath}`);
  if (failed.length) { console.error(`verify: FAILED (${failed.map((r) => r.id).join(', ')})`); process.exit(1); }
  console.log(`verify: OK${opts.strict ? ' (strict)' : ''}`);
}

main();
