import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSteps, parseArgs } from '../lib/verify-steps.mjs';
import { cleanPath, yarnInvocation } from '../lib/yarn.mjs';

const scriptsOf = (dir) => ({
  'admin-app': { verify: 'x', build: 'x' },
  service: { typecheck: 'x', test: 'x' },
  mcp: null,
  puck: { verify: 'x' },
})[dir];
const get = (steps, id) => steps.find((s) => s.id === id);

test('per-app steps follow the script contract', () => {
  const s = buildSteps({}, scriptsOf);
  assert.deepEqual(get(s, 'admin-app').seq, [['yarn', ['run', 'verify']]]);
  assert.deepEqual(get(s, 'service').seq, [['yarn', ['run', 'typecheck']], ['yarn', ['run', 'test']]]);
  assert.equal(get(s, 'mcp').skip, 'no package.json');
  assert.equal(get(s, 'connect-validate'), undefined);
});

test('mcp does not run its live verify script; it runs the offline chain', () => {
  const s = buildSteps({}, (d) => (d === 'mcp' ? { verify: 'live', 'check:app': 'x', 'check:connect-block': 'x' } : null));
  assert.deepEqual(get(s, 'mcp').seq, [['yarn', ['run', 'check:app']], ['yarn', ['run', 'check:connect-block']]]);
});

test('strict adds connect validate, empty pending and strict hygiene', () => {
  const s = buildSteps({ strict: true }, scriptsOf);
  assert.ok(get(s, 'connect-validate'));
  assert.ok(get(s, 'forbidden').args.includes('--require-empty-pending'));
  assert.ok(get(s, 'hygiene').args.includes('--strict'));
});

test('install steps use the right frozen flag per Yarn generation', () => {
  const s = buildSteps({ install: true }, (d) => (d === 'mcp' ? { test: 'x' } : scriptsOf(d)));
  const inst = s.filter((x) => x.id.endsWith(':install'));
  assert.ok(inst.every((x) => x.cmd === 'yarn'));
  assert.deepEqual(get(s, 'puck:install').args, ['install', '--immutable']);
  assert.deepEqual(get(s, 'service:install').args, ['install', '--frozen-lockfile']);
  assert.deepEqual(get(s, 'mcp:install').args, ['install', '--frozen-lockfile']);
});

test('--only and --skip filter by base id', () => {
  assert.deepEqual(buildSteps({ only: ['spdx'] }, scriptsOf).map((s) => s.id), ['spdx']);
  assert.ok(!buildSteps({ skip: ['puck'], install: true }, scriptsOf).some((s) => s.id.startsWith('puck')));
});

test('parseArgs', () => {
  assert.deepEqual(parseArgs(['--only', 'a,b', '--strict']).only, ['a', 'b']);
  assert.throws(() => parseArgs(['--nope']));
});

test('yarn resolution: Yarn 4 trees use corepack with the Yarn 1 PATH injection removed', () => {
  const inv = yarnInvocation('yarn@4.5.1', { PATH: '/tmp/yarn--123-45/node:/tmp/yarn--123-45:/usr/bin' });
  assert.equal(inv.cmd, 'corepack');
  assert.deepEqual(inv.prefix, ['yarn']);
  assert.equal(inv.env.PATH, '/usr/bin');
  assert.equal(yarnInvocation(null).cmd, 'yarn');
  assert.equal(yarnInvocation('yarn@1.22.22').cmd, 'yarn');
  assert.equal(cleanPath('/a:/b'), '/a:/b');
});
