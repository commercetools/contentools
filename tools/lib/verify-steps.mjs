/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { TARGETS } from './targets.mjs';

/**
 * Apps whose `verify` script is NOT an offline gate (mcp's `verify` is the live end-to-end check against a running
 * server and needs a token) get an explicit chain instead. Missing scripts are dropped from the chain.
 */
export const CHAIN_OVERRIDES = {
  mcp: ['check:app', 'check:connect-block'],
};

const installCmd = (t) => ({ cwd: t.dir, cmd: 'yarn', args: t.dir === 'puck' ? ['install', '--immutable'] : ['install', '--frozen-lockfile'] });

/** scriptsOf(dir) -> package.json "scripts" object or null. Returns the ordered step list. */
export function buildSteps(opts, scriptsOf) {
  const steps = [
    { id: 'tools', cmd: 'node', args: ['--test', 'tools/test/*.test.mjs'], cwd: '.' },
    { id: 'spdx', cmd: 'node', args: ['tools/check-spdx-headers.mjs'], cwd: '.' },
    { id: 'forbidden', cmd: 'node', args: ['tools/check-forbidden-terms.mjs', ...(opts.strict ? ['--require-empty-pending'] : [])], cwd: '.' },
    { id: 'legacy-calls', cmd: 'node', args: ['tools/check-legacy-route-calls.mjs'], cwd: '.' },
    { id: 'hygiene', cmd: 'node', args: ['tools/check-repo-hygiene.mjs', ...(opts.strict ? ['--strict'] : [])], cwd: '.' },
    { id: 'connect-contract', cmd: 'node', args: ['tools/check-connect-contract.mjs'], cwd: '.' },
  ];
  for (const t of TARGETS) {
    const scripts = scriptsOf(t.dir);
    let names = [];
    if (scripts !== null) {
      if (CHAIN_OVERRIDES[t.name]) names = CHAIN_OVERRIDES[t.name].filter((s) => s in scripts);
      else names = 'verify' in scripts ? ['verify'] : ['typecheck', 'lint', 'test', 'build'].filter((s) => s in scripts);
    }
    if (opts.install && scripts !== null) steps.push({ id: `${t.name}:install`, ...installCmd(t) });
    if (names.length === 0) {
      steps.push({ id: t.name, skip: scripts === null ? 'no package.json' : 'no verify/typecheck/lint/test/build script' });
      continue;
    }
    steps.push({ id: t.name, cwd: t.dir, seq: names.map((s) => ['yarn', ['run', s]]) });
  }
  if (opts.connect || opts.strict) {
    steps.push({ id: 'admin-app-connect-build', cmd: 'node', args: ['tools/admin-app-simulate-connect-build.mjs'], cwd: '.' });
    steps.push({ id: 'connect-validate', cmd: 'commercetools', args: ['connect', 'validate', '.'], cwd: '.', requires: 'commercetools' });
  }
  const base = (s) => s.id.split(':')[0];
  return steps.filter((s) => !opts.only || opts.only.includes(base(s))).filter((s) => !(opts.skip ?? []).includes(base(s)));
}

/** Pure: parse argv (without node and script) into options. Throws on unknown flags. */
export function parseArgs(argv) {
  const o = { only: null, skip: [], failFast: false, install: false, connect: false, strict: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') o.only = (argv[++i] ?? '').split(',').filter(Boolean);
    else if (a === '--skip') o.skip = (argv[++i] ?? '').split(',').filter(Boolean);
    else if (a === '--fail-fast') o.failFast = true;
    else if (a === '--install') o.install = true;
    else if (a === '--connect') o.connect = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown flag: ${a}`);
  }
  return o;
}
